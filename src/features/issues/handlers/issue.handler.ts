import { BaseHandler } from "../../../core/handlers/base.handler.js";
import { BaseToolResponse } from "../../../core/interfaces/tool-handler.interface.js";
import { LinearAuth } from "../../../auth.js";
import { LinearGraphQLClient } from "../../../graphql/client.js";
import {
  IssueHandlerMethods,
  CreateIssueInput,
  CreateIssuesInput,
  BulkUpdateIssuesInput,
  SearchIssuesInput,
  SearchIssuesInCommentsInput,
  SearchIssuesByIdentifierInput,
  DeleteIssueInput,
  CreateIssueResponse,
  CreateIssuesResponse,
  UpdateIssueResponse,
  SearchIssuesResponse,
  DeleteIssueResponse,
  Issue,
  IssueBatchResponse,
  GetIssueInput,
  EditIssueInput,
  GetIssueRelationsInput,
  GetIssueHistoryInput,
  CreateIssueRelationInput,
  GetIssueRelationsResponse,
  GetIssueHistoryResponse,
  CreateIssueRelationResponse,
  ListViewsInput,
  GetViewIssuesInput,
  ListViewsResponse,
  GetViewIssuesResponse,
} from "../types/issue.types.js";
import { DocumentNode } from "graphql";

/**
 * Handler for issue-related operations.
 * Manages creating, updating, searching, and deleting issues.
 */
export class IssueHandler extends BaseHandler implements IssueHandlerMethods {
  constructor(auth: LinearAuth, graphqlClient?: LinearGraphQLClient) {
    super(auth, graphqlClient);
  }

  /**
   * Creates a single issue.
   */
  async handleCreateIssue(args: CreateIssueInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["title", "description", "teamId"]);

      const result = (await client.createIssue(args)) as CreateIssueResponse;

      if (!result.issueCreate.success || !result.issueCreate.issue) {
        throw new Error("Failed to create issue");
      }

      const issue = result.issueCreate.issue;

      const parentInfo = issue.parent
        ? `Parent: ${issue.parent.identifier} (${issue.parent.title})\n`
        : "";
      const childrenInfo = issue.children?.nodes?.length
        ? `Children:\n${issue.children.nodes
            .map((child) => `- ${child.identifier}: ${child.title}`)
            .join("\n")}\n`
        : "";

      return this.createJsonResponse({
        issueCreate: {
          success: true,
          issue: {
            identifier: issue.identifier,
            title: issue.title,
            url: issue.url,
            project: issue.project,
            parent: issue.parent,
            children: issue.children,
          },
        },
      });
    } catch (error) {
      this.handleError(error, "create issue");
    }
  }

  /**
   * Creates multiple issues in bulk.
   */
  async handleCreateIssues(args: CreateIssuesInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["issues"]);

      if (!Array.isArray(args.issues)) {
        throw new Error("Issues parameter must be an array");
      }

      const result = (await client.createIssues(
        args.issues
      )) as IssueBatchResponse;

      if (!result.issueBatchCreate.success) {
        throw new Error("Failed to create issues");
      }

      const createdIssues = result.issueBatchCreate.issues;

      return this.createResponse(
        `Successfully created ${createdIssues.length} issues:\n` +
          createdIssues
            .map(
              (issue: Issue) =>
                `- ${issue.identifier}: ${issue.title}\n  URL: ${issue.url}`
            )
            .join("\n")
      );
    } catch (error) {
      this.handleError(error, "create issues");
    }
  }

  /**
   * Updates multiple issues in bulk.
   */
  async handleBulkUpdateIssues(
    args: BulkUpdateIssuesInput
  ): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["issueIds", "update"]);

      if (!Array.isArray(args.issueIds)) {
        throw new Error("IssueIds parameter must be an array");
      }

      const result = (await client.updateIssues(
        args.issueIds,
        args.update
      )) as UpdateIssueResponse;

      if (!result.issueUpdate.success) {
        throw new Error("Failed to update issues");
      }

      // Since the response only contains a single issue, we count the number of IDs that were updated
      const updatedCount = args.issueIds.length;

      return this.createResponse(`Successfully updated ${updatedCount} issues`);
    } catch (error) {
      this.handleError(error, "update issues");
    }
  }

  /**
   * Searches for issues with filtering and pagination.
   */
  /**
   * Build a Linear IssueFilter from the flat search parameters shared by
   * handleSearchIssues and handleSearchIssuesInComments.
   */
  private buildIssueFilter(
    args: SearchIssuesInput | SearchIssuesInCommentsInput
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (args.teamIds) filter.team = { id: { in: args.teamIds } };

    // Unassigned (assignee = none) takes precedence over assigneeIds.
    if (args.unassigned) {
      filter.assignee = { null: true };
    } else if (args.assigneeIds) {
      filter.assignee = { id: { in: args.assigneeIds } };
    }

    // State by name and/or by type (backlog/unstarted/started/completed/
    // canceled). Both combine as AND within the same state filter.
    const state: Record<string, unknown> = {};
    if (args.states) state.name = { in: args.states };
    if (args.stateTypes) state.type = { in: args.stateTypes };
    if (Object.keys(state).length) filter.state = state;

    if (typeof args.priority === "number") filter.priority = { eq: args.priority };
    if (args.projectId) filter.project = { id: { eq: args.projectId } };

    // labelIds (UUIDs) take precedence over labels (names); ANY-match.
    if (args.labelIds?.length) {
      filter.labels = { some: { id: { in: args.labelIds } } };
    } else if (args.labels?.length) {
      filter.labels = { some: { name: { in: args.labels } } };
    }

    if (args.updatedSince) filter.updatedAt = { gte: args.updatedSince };
    if (args.createdSince) filter.createdAt = { gte: args.createdSince };

    if (args.blocked) filter.hasBlockedByRelations = { eq: true };
    if (args.blocking) filter.hasBlockingRelations = { eq: true };

    // Orphan (no parent) takes precedence over parentId (subtasks of X).
    if (args.noParent) {
      filter.parent = { null: true };
    } else if (args.parentId) {
      filter.parent = { id: { eq: args.parentId } };
    }

    return filter;
  }

  async handleSearchIssues(args: SearchIssuesInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();

      const filter = this.buildIssueFilter(args);

      // Legacy nested filter support (identifier / project).
      if (args.filter?.identifier) {
        filter.identifier = { in: [args.filter.identifier] };
      }
      if (args.filter?.project?.id?.eq) {
        filter.project = { id: { eq: args.filter.project.id.eq } };
      }

      // Use Linear's searchIssues endpoint for free-text search (no identifier filter)
      const result = (args.query && !args.filter?.identifier
        ? await client.searchIssuesFulltext(
            args.query,
            filter,
            args.first || 50,
            args.after,
            args.orderBy || "updatedAt"
          )
        : await client.searchIssues(
            filter,
            args.first || 50,
            args.after,
            args.orderBy || "updatedAt"
          )) as SearchIssuesResponse;

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "search issues");
    }
  }

  /**
   * Full-text search including comment content, with snippet capping to protect context windows.
   */
  async handleSearchIssuesInComments(
    args: SearchIssuesInCommentsInput
  ): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();

      const filter = this.buildIssueFilter(args);

      const result = (await client.searchIssuesInComments(
        args.query,
        filter,
        args.first || 25,
        args.after,
        "updatedAt",
        args.snippetSize || 200
      )) as SearchIssuesResponse;

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "search issues in comments");
    }
  }

  /**
   * Search for issues by their identifiers (e.g., ["MIC-78", "MIC-79"])
   */
  async handleSearchIssuesByIdentifier(
    args: SearchIssuesByIdentifierInput
  ): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["identifiers"]);

      if (!Array.isArray(args.identifiers)) {
        throw new Error("Identifiers parameter must be an array");
      }

      const result = (await client.searchIssues(
        { identifier: { in: args.identifiers } },
        100,
        undefined,
        "updatedAt"
      )) as SearchIssuesResponse;

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "search issues by identifier");
    }
  }

  /**
   * Get a single issue by identifier, including all comments
   */
  async handleGetIssue(args: GetIssueInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["identifier"]);

      // Use the same query as search by identifier but with a single identifier
      const result = (await client.searchIssues(
        { identifier: { in: [args.identifier] } },
        1,
        undefined,
        "updatedAt"
      )) as SearchIssuesResponse;

      if (!result.issues.nodes || result.issues.nodes.length === 0) {
        throw new Error(`Issue ${args.identifier} not found`);
      }

      return this.createJsonResponse({
        issue: result.issues.nodes[0],
      });
    } catch (error) {
      this.handleError(error, "get issue");
    }
  }

  /**
   * Resolve a human identifier (e.g. "ENG-123") to an issue UUID.
   * Passes UUIDs straight through.
   */
  private async resolveIssueId(
    client: LinearGraphQLClient,
    idOrIdentifier: string
  ): Promise<string> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrIdentifier
      );
    if (isUuid) return idOrIdentifier;

    const result = (await client.searchIssues(
      { identifier: { in: [idOrIdentifier] } },
      1,
      undefined,
      "updatedAt"
    )) as SearchIssuesResponse;

    const node = result.issues.nodes?.[0];
    if (!node?.id) {
      throw new Error(`Issue ${idOrIdentifier} not found`);
    }
    return node.id;
  }

  /**
   * Get formal Linear relations for an issue. Returns blocks / blocked-by /
   * related / duplicate. `blocked-by` is synthesised from inverse `blocks`
   * relations (Linear stores no `blocked-by` type).
   */
  async handleGetIssueRelations(
    args: GetIssueRelationsInput
  ): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["identifier"]);

      const result = (await client.getIssueRelations(
        args.identifier
      )) as GetIssueRelationsResponse;

      if (!result.issue) {
        throw new Error(`Issue ${args.identifier} not found`);
      }

      const outgoing = (result.issue.relations?.nodes ?? []).map((r) => ({
        // From this issue's perspective the type reads directly.
        type: r.type,
        issue: r.relatedIssue,
      }));

      const incoming = (result.issue.inverseRelations?.nodes ?? []).map((r) => ({
        // Seen from the other side: a `blocks` becomes `blocked-by`, etc.
        type: r.type === "blocks" ? "blocked-by" : r.type,
        issue: r.issue,
      }));

      return this.createJsonResponse({
        identifier: result.issue.identifier,
        title: result.issue.title,
        relations: [...outgoing, ...incoming],
      });
    } catch (error) {
      this.handleError(error, "get issue relations");
    }
  }

  /**
   * Get an issue's activity history (state/assignee/priority/title/relation
   * changes with timestamps). Comment additions are not part of history.
   */
  async handleGetIssueHistory(
    args: GetIssueHistoryInput
  ): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["identifier"]);

      const result = (await client.getIssueHistory(
        args.identifier,
        args.first ?? 50
      )) as GetIssueHistoryResponse;

      if (!result.issue) {
        throw new Error(`Issue ${args.identifier} not found`);
      }

      return this.createJsonResponse({
        identifier: result.issue.identifier,
        history: result.issue.history?.nodes ?? [],
      });
    } catch (error) {
      this.handleError(error, "get issue history");
    }
  }

  /**
   * Create a formal relation (blocks/related/duplicate) between two issues.
   * Accepts identifiers or UUIDs; resolves identifiers to UUIDs first.
   */
  async handleCreateIssueRelation(
    args: CreateIssueRelationInput
  ): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, [
        "issueId",
        "relatedIssueId",
        "type",
      ]);

      const validTypes = ["blocks", "related", "duplicate"];
      if (!validTypes.includes(args.type)) {
        throw new Error(
          `Invalid relation type "${args.type}". Must be one of: ${validTypes.join(
            ", "
          )}`
        );
      }

      const [issueId, relatedIssueId] = await Promise.all([
        this.resolveIssueId(client, args.issueId),
        this.resolveIssueId(client, args.relatedIssueId),
      ]);

      const result = (await client.createIssueRelation(
        issueId,
        relatedIssueId,
        args.type
      )) as CreateIssueRelationResponse;

      if (!result.issueRelationCreate?.success) {
        throw new Error("Failed to create issue relation");
      }

      return this.createJsonResponse(result.issueRelationCreate);
    } catch (error) {
      this.handleError(error, "create issue relation");
    }
  }

  /**
   * List custom/saved views (to discover view IDs).
   */
  async handleListViews(args: ListViewsInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      const result = (await client.listViews(
        args.first ?? 50
      )) as ListViewsResponse;
      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "list views");
    }
  }

  /**
   * Get the issues a custom view resolves to (the view's own filter applied).
   */
  async handleGetViewIssues(
    args: GetViewIssuesInput
  ): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["id"]);

      const result = (await client.getViewIssues(
        args.id,
        args.first ?? 50
      )) as GetViewIssuesResponse;

      if (!result.customView) {
        throw new Error(`View ${args.id} not found`);
      }

      return this.createJsonResponse({
        view: {
          id: result.customView.id,
          name: result.customView.name,
        },
        issues: result.customView.issues,
      });
    } catch (error) {
      this.handleError(error, "get view issues");
    }
  }

  /**
   * Deletes a single issue.
   */
  async handleDeleteIssue(args: DeleteIssueInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["id"]);

      const result = (await client.deleteIssue(args.id)) as DeleteIssueResponse;

      if (!result.issueDelete.success) {
        throw new Error("Failed to delete issue");
      }

      return this.createResponse(`Successfully deleted issue ${args.id}`);
    } catch (error) {
      this.handleError(error, "delete issue");
    }
  }

  /**
   * Edits a single issue.
   */
  async handleEditIssue(args: EditIssueInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["issueId"]);

      // Construct the input object for the GraphQL mutation
      // Only include fields that are actually provided in the args
      const updateInput: Record<string, any> = {};
      const optionalFields: (keyof EditIssueInput)[] = [
        "title",
        "description",
        "stateId",
        "priority",
        "assigneeId",
        "labelIds",
        "projectId",
        "projectMilestoneId",
        "estimate",
        "dueDate",
        "parentId",
        "sortOrder",
      ];

      optionalFields.forEach((field) => {
        // Check for undefined or null, allowing empty strings and 0
        if (args[field] !== undefined && args[field] !== null) {
          updateInput[field] = args[field];
        }
      });

      // Check if any update fields were provided besides issueId
      if (Object.keys(updateInput).length === 0) {
        throw new Error(
          "No fields provided to update for issue " + args.issueId
        );
      }

      // Call the GraphQL client method (to be implemented in Step 5)
      // Assuming it returns an object like { issueUpdate: { success: boolean, issue: Issue } }
      const result = await client.updateIssue(args.issueId, updateInput);

      if (!result?.issueUpdate?.success || !result?.issueUpdate?.issue) {
        throw new Error(
          `Failed to update issue ${
            args.issueId
          }. API response: ${JSON.stringify(result)}`
        );
      }

      const updatedIssue = result.issueUpdate.issue;

      // Return a success response with basic issue details
      return this.createJsonResponse({
        issueUpdate: {
          success: true,
          issue: {
            id: updatedIssue.id,
            identifier: updatedIssue.identifier,
            title: updatedIssue.title,
            url: updatedIssue.url,
            updatedAt: updatedIssue.updatedAt, // Include updatedAt for confirmation
          },
        },
      });
    } catch (error) {
      this.handleError(error, "edit issue");
    }
  }
}
