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
  IssueFilterParams,
  CreateViewInput,
  UpdateViewInput,
  DeleteViewInput,
  CreateViewResponse,
  UpdateViewResponse,
  DeleteViewResponse,
  ListCyclesInput,
  ListCyclesResponse,
  SetIssueCycleInput,
  SetIssueCycleResponse,
  GetIssueCommentsInput,
  GetIssueResponse,
  GetIssueCommentsResponse,
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
            id: issue.id,
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
  private buildIssueFilter(args: IssueFilterParams): Record<string, unknown> {
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
    // name supports both include (in) and exclude (nin), merged.
    if (args.states || args.notStates) {
      const name: Record<string, unknown> = {};
      if (args.states) name.in = args.states;
      if (args.notStates) name.nin = args.notStates;
      state.name = name;
    }
    if (args.stateTypes) state.type = { in: args.stateTypes };
    if (Object.keys(state).length) filter.state = state;

    if (typeof args.priority === "number") filter.priority = { eq: args.priority };

    // Project: noProject (project = none) takes precedence over projectId.
    if (args.noProject) {
      filter.project = { null: true };
    } else if (args.projectId) {
      filter.project = { id: { eq: args.projectId } };
    }

    // Labels. noLabels (zero labels) is exclusive and wins. Otherwise an
    // include clause (labelIds UUIDs take precedence over names, ANY-match via
    // `some`) and an exclude clause (notLabels via `every.name.nin` — issue has
    // NONE of these; unlabelled issues match vacuously) combine as AND.
    if (args.noLabels) {
      filter.labels = { length: { eq: 0 } };
    } else {
      const labels: Record<string, unknown> = {};
      if (args.labelIds?.length) {
        labels.some = { id: { in: args.labelIds } };
      } else if (args.labels?.length) {
        labels.some = { name: { in: args.labels } };
      }
      if (args.notLabels?.length) {
        labels.every = { name: { nin: args.notLabels } };
      }
      if (Object.keys(labels).length) filter.labels = labels;
    }

    // updatedAt window. Absolute bounds (updatedSince/updatedBefore — ISO-8601
    // or a relative duration like "-P7D") win; the *DaysAgo sugar emits the
    // relative duration for callers who just want "rolling last N days" /
    // "stale > N days" without hand-writing -PnD.
    const gte =
      args.updatedSince ??
      (typeof args.updatedWithinDays === "number"
        ? `-P${args.updatedWithinDays}D`
        : undefined);
    const lte =
      args.updatedBefore ??
      (typeof args.updatedMoreThanDaysAgo === "number"
        ? `-P${args.updatedMoreThanDaysAgo}D`
        : undefined);
    if (gte || lte) {
      const updatedAt: Record<string, unknown> = {};
      if (gte) updatedAt.gte = gte;
      if (lte) updatedAt.lte = lte;
      filter.updatedAt = updatedAt;
    }
    if (args.createdSince) filter.createdAt = { gte: args.createdSince };

    if (args.blocked) filter.hasBlockedByRelations = { eq: true };
    if (args.blocking) filter.hasBlockingRelations = { eq: true };

    // Parent. noParent (no parent at all) takes precedence. Otherwise combine
    // parentId (subtasks of X) with parent-state filters (parentStates /
    // notParentStates → parent.state.name in/nin) — e.g. "child whose parent is
    // Done/Canceled" surfaces orphaned-by-closed-parent work.
    if (args.noParent) {
      filter.parent = { null: true };
    } else {
      const parent: Record<string, unknown> = {};
      if (args.parentId) parent.id = { eq: args.parentId };
      if (args.parentStates || args.notParentStates) {
        const name: Record<string, unknown> = {};
        if (args.parentStates) name.in = args.parentStates;
        if (args.notParentStates) name.nin = args.notParentStates;
        parent.state = { name };
      }
      if (Object.keys(parent).length) filter.parent = parent;
    }

    // Cycle membership. `cycle` (positive) wins over `notCycle` (negated).
    // Keywords map to Linear's NullableCycleFilter boolean flags; "none" maps
    // to null (no cycle); anything else is treated as a cycle UUID.
    const cycleClause = (
      v: string,
      negate: boolean
    ): Record<string, unknown> => {
      if (v === "none") return { null: !negate };
      const flag =
        v === "current"
          ? "isActive"
          : v === "next"
          ? "isNext"
          : v === "previous"
          ? "isPrevious"
          : null;
      if (flag) return { [flag]: negate ? { neq: true } : { eq: true } };
      return { id: negate ? { neq: v } : { eq: v } };
    };
    if (args.cycle) {
      filter.cycle = cycleClause(args.cycle, false);
    } else if (args.notCycle) {
      filter.cycle = cycleClause(args.notCycle, true);
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

      // Lean by default: drop full issue bodies, which otherwise dominate the
      // payload and blow the context window on broad searches. Set lean:false
      // to opt back in. get_issue remains the way to read a single full body.
      if (args.lean !== false && result?.issues?.nodes) {
        result.issues.nodes = result.issues.nodes.map((n) => {
          const { description, ...rest } = n as { description?: unknown };
          return rest;
        }) as typeof result.issues.nodes;
      }

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
   * Extract referenced issue identifiers (e.g. "TEH-123") from free text,
   * deduped and excluding `self`. Surfaces a ticket's cross-links cheaply so
   * agents can traverse the graph without reading full bodies.
   */
  private extractLinkedIdentifiers(text: string, self: string): string[] {
    const matches = text.match(/\b[A-Z]{2,5}-\d+\b/g) ?? [];
    return [...new Set(matches)].filter((id) => id !== self);
  }

  /**
   * Cap a comment body for the inline recent-comments preview. Long threads
   * dominated get_issue payloads; the preview only needs enough to convey what
   * the comment was about. The full text is available via
   * linear_get_issue_comments.
   */
  /**
   * Build the human-readable browser URL for a custom view. CustomView has no
   * `url` field, but the view is reachable at
   * linear.app/{org urlKey}/view/{slugId}. Returns null if either part is
   * missing.
   */
  private viewUrl(
    slugId?: string | null,
    urlKey?: string | null
  ): string | null {
    if (!slugId || !urlKey) return null;
    return `https://linear.app/${urlKey}/view/${slugId}`;
  }

  /**
   * Reshape a customView mutation result: replace the nested `organization`
   * with a flat, ready-to-open `url` built from slugId + org urlKey.
   */
  private shapeViewResult(r: {
    success: boolean;
    customView: {
      id: string;
      name: string;
      slugId?: string | null;
      organization?: { urlKey?: string | null } | null;
    };
  }): Record<string, unknown> {
    const { organization, ...cv } = r.customView;
    return {
      success: r.success,
      customView: { ...cv, url: this.viewUrl(cv.slugId, organization?.urlKey) },
    };
  }

  private truncateBody(body: string, max = 800): string {
    if (!body || body.length <= max) return body;
    return `${body.slice(0, max)}\n…[truncated ${
      body.length - max
    } chars — use linear_get_issue_comments for the full thread]`;
  }

  /**
   * Get a single issue by identifier: full body + structure + cross-links, plus
   * only the most recent N comments (default 5). Older comments are not
   * included — `comments.hasMore` signals they exist; page them with
   * linear_get_issue_comments. This keeps the common read lean while preserving
   * the recent-discussion signal that flags already-resolved work.
   */
  async handleGetIssue(args: GetIssueInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["identifier"]);

      // Default to 2 recent comments (was 5). Comment bodies were ~44% of the
      // average get_issue payload, yet most reads only need the
      // recent-activity signal (is there fresh discussion / already-resolved
      // work?), not the full thread. hasMore + linear_get_issue_comments still
      // expose the rest on demand. Callers that want the thread inline can
      // raise commentLimit.
      const commentLimit = args.commentLimit ?? 2;

      const result = (await client.getIssue(
        args.identifier,
        commentLimit
      )) as GetIssueResponse;

      if (!result.issue) {
        throw new Error(`Issue ${args.identifier} not found`);
      }

      const issue = result.issue;
      // Linear returns comments newest-first already. Truncate long bodies:
      // the recent-comment signal needs the gist, not every word — the full
      // text is one linear_get_issue_comments call away.
      const recentComments = (issue.comments?.nodes ?? []).map((c) => ({
        ...c,
        body: this.truncateBody(c.body),
      }));

      // Cross-links from body + the comments we have.
      const linkSource =
        (issue.description ?? "") +
        "\n" +
        recentComments.map((c) => c.body).join("\n");
      const linkedIdentifiers = this.extractLinkedIdentifiers(
        linkSource,
        issue.identifier
      );

      const { comments, ...issueRest } = issue;

      return this.createJsonResponse({
        issue: {
          ...issueRest,
          linkedIdentifiers,
          comments: {
            hasMore: issue.comments?.pageInfo?.hasNextPage ?? false,
            returned: recentComments.length,
            nodes: recentComments,
          },
        },
      });
    } catch (error) {
      this.handleError(error, "get issue");
    }
  }

  /**
   * Get a single issue's full comment thread, paginated (oldest-first).
   */
  async handleGetIssueComments(
    args: GetIssueCommentsInput
  ): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["identifier"]);

      const result = (await client.getIssueComments(
        args.identifier,
        args.first ?? 50,
        args.after
      )) as GetIssueCommentsResponse;

      if (!result.issue) {
        throw new Error(`Issue ${args.identifier} not found`);
      }

      return this.createJsonResponse({
        identifier: result.issue.identifier,
        comments: result.issue.comments,
      });
    } catch (error) {
      this.handleError(error, "get issue comments");
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
      // Attach a ready-to-open url (built from slugId + org urlKey) to each
      // node and drop the nested organization object.
      const nodes = result.customViews.nodes.map((n) => {
        const { organization, ...rest } = n;
        return { ...rest, url: this.viewUrl(n.slugId, organization?.urlKey) };
      });
      return this.createJsonResponse({
        customViews: { ...result.customViews, nodes },
      });
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
   * Create a custom/saved view. The filter is built from the same flat
   * vocabulary as issue search (buildIssueFilter) and passed as the view's
   * filterData. Omit teamId for a workspace-shared view; provide it to scope
   * the view to a team. An empty filter creates a view over all issues.
   */
  async handleCreateView(args: CreateViewInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["name"]);

      const filter = this.buildIssueFilter(args);
      const input: Record<string, unknown> = { name: args.name };
      if (args.description !== undefined) input.description = args.description;
      if (args.teamId !== undefined) input.teamId = args.teamId;
      if (args.shared !== undefined) input.shared = args.shared;
      if (Object.keys(filter).length) input.filterData = filter;

      const result = (await client.createView(input)) as CreateViewResponse;
      return this.createJsonResponse(this.shapeViewResult(result.customViewCreate));
    } catch (error) {
      this.handleError(error, "create view");
    }
  }

  /**
   * Update a custom view. Only the fields provided are changed. Supplying any
   * filter knob replaces the view's filterData wholesale (Linear has no
   * partial-filter merge); omit all filter knobs to rename/re-describe without
   * touching the filter.
   */
  async handleUpdateView(args: UpdateViewInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["id"]);

      const input: Record<string, unknown> = {};
      if (args.name !== undefined) input.name = args.name;
      if (args.description !== undefined) input.description = args.description;
      if (args.teamId !== undefined) input.teamId = args.teamId;
      if (args.shared !== undefined) input.shared = args.shared;

      const filter = this.buildIssueFilter(args);
      if (Object.keys(filter).length) input.filterData = filter;

      const result = (await client.updateView(
        args.id,
        input
      )) as UpdateViewResponse;
      return this.createJsonResponse(this.shapeViewResult(result.customViewUpdate));
    } catch (error) {
      this.handleError(error, "update view");
    }
  }

  /**
   * Delete a custom view by UUID.
   */
  async handleDeleteView(args: DeleteViewInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["id"]);

      const result = (await client.deleteView(args.id)) as DeleteViewResponse;
      return this.createJsonResponse(result.customViewDelete);
    } catch (error) {
      this.handleError(error, "delete view");
    }
  }

  /**
   * Map a cycle keyword to its NullableCycleFilter boolean flag.
   */
  private cycleFlag(keyword: string): "isActive" | "isNext" | "isPrevious" | null {
    return keyword === "current"
      ? "isActive"
      : keyword === "next"
      ? "isNext"
      : keyword === "previous"
      ? "isPrevious"
      : null;
  }

  /**
   * List cycles, optionally scoped to a team and/or a position
   * (current/next/previous/past/future). Each node carries the isActive/isNext/
   * isPrevious flags so callers can pick the one they mean.
   */
  async handleListCycles(args: ListCyclesInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();

      const filter: Record<string, unknown> = {};
      if (args.teamId) filter.team = { id: { eq: args.teamId } };
      if (args.filter) {
        const flag = this.cycleFlag(args.filter);
        if (flag) filter[flag] = { eq: true };
        else if (args.filter === "past") filter.isPast = { eq: true };
        else if (args.filter === "future") filter.isFuture = { eq: true };
      }

      const result = (await client.listCycles(
        Object.keys(filter).length ? filter : undefined,
        args.first ?? 50
      )) as ListCyclesResponse;

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "list cycles");
    }
  }

  /**
   * Set (or clear) an issue's cycle. `cycle` accepts a UUID, "none" (unassign),
   * or a keyword (current/next/previous) which is resolved to the matching
   * cycle for the issue's team. Pass teamId to disambiguate in a multi-team
   * workspace.
   */
  async handleSetIssueCycle(
    args: SetIssueCycleInput
  ): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["issueId", "cycle"]);

      let cycleId: string | null;
      if (args.cycle === "none") {
        cycleId = null;
      } else {
        const flag = this.cycleFlag(args.cycle);
        if (flag) {
          const filter: Record<string, unknown> = { [flag]: { eq: true } };
          if (args.teamId) filter.team = { id: { eq: args.teamId } };
          const cycles = (await client.listCycles(filter, 10))
            .cycles.nodes;
          if (!cycles.length) {
            throw new Error(`No "${args.cycle}" cycle found`);
          }
          if (cycles.length > 1) {
            throw new Error(
              `Ambiguous "${args.cycle}" cycle across ${cycles.length} teams — pass teamId`
            );
          }
          cycleId = cycles[0].id;
        } else {
          // Treat as a cycle UUID.
          cycleId = args.cycle;
        }
      }

      const result = (await client.setIssueCycle(
        args.issueId,
        cycleId
      )) as SetIssueCycleResponse;
      return this.createJsonResponse(result.issueUpdate);
    } catch (error) {
      this.handleError(error, "set issue cycle");
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
