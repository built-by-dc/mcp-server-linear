import { LinearClient } from "@linear/sdk";
import { DocumentNode } from "graphql";
import {
  CreateIssueInput,
  CreateIssueResponse,
  CreateIssuesResponse,
  UpdateIssueInput,
  UpdateIssueResponse,
  SearchIssuesInput,
  SearchIssuesResponse,
  DeleteIssueResponse,
  Issue,
  IssueBatchResponse,
  GetIssueRelationsResponse,
  GetIssueHistoryResponse,
  CreateIssueRelationResponse,
  DeleteIssueRelationResponse,
  IssueRelationType,
  ListViewsResponse,
  GetViewIssuesResponse,
  CreateViewResponse,
  UpdateViewResponse,
  DeleteViewResponse,
  ListCyclesResponse,
  SetIssueCycleResponse,
  ListNotificationsResponse,
  GetIssueResponse,
  GetIssueCommentsResponse,
} from "../features/issues/types/issue.types.js";
import {
  ProjectInput,
  ProjectResponse,
  SearchProjectsResponse,
  ProjectFilter,
  GetProjectMilestonesResponse,
  ProjectMilestone,
} from "../features/projects/types/project.types.js";
import {
  TeamResponse,
  LabelInput,
  LabelResponse,
} from "../features/teams/types/team.types.js";
import { UserResponse } from "../features/users/types/user.types.js";
import {
  GetDocumentResponse,
  ListDocumentsResponse,
  DocumentFilter,
  SaveDocumentArgs,
  DocumentMutationResponse,
} from "../features/documents/types/document.types.js";

export class LinearGraphQLClient {
  private linearClient: LinearClient;

  constructor(linearClient: LinearClient) {
    this.linearClient = linearClient;
  }

  async execute<T, V extends Record<string, unknown> = Record<string, unknown>>(
    document: DocumentNode,
    variables?: V
  ): Promise<T> {
    const graphQLClient = this.linearClient.client;
    try {
      const response = await graphQLClient.rawRequest(
        document.loc?.source.body || "",
        variables
      );
      return response.data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`GraphQL operation failed: ${error.message}`);
      }
      throw error;
    }
  }

  // Create single issue
  async createIssue(input: CreateIssueInput): Promise<CreateIssueResponse> {
    const { CREATE_ISSUE_MUTATION } = await import("./mutations.js");
    return this.execute<CreateIssueResponse>(CREATE_ISSUE_MUTATION, { input });
  }

  // List the viewer's notifications (the Inbox), optionally filtered by type
  // and createdAt.
  async listNotifications(
    filter: Record<string, unknown> | undefined,
    first: number = 50
  ): Promise<ListNotificationsResponse> {
    const { LIST_NOTIFICATIONS_QUERY } = await import("./queries.js");
    return this.execute<ListNotificationsResponse>(LIST_NOTIFICATIONS_QUERY, {
      filter,
      first,
    });
  }

  // List cycles, optionally filtered (e.g. by team or isActive/isNext flags).
  async listCycles(
    filter: Record<string, unknown> | undefined,
    first: number = 50
  ): Promise<ListCyclesResponse> {
    const { LIST_CYCLES_QUERY } = await import("./queries.js");
    return this.execute<ListCyclesResponse>(LIST_CYCLES_QUERY, {
      filter,
      first,
    });
  }

  // Set (or clear, with cycleId=null) an issue's cycle.
  async setIssueCycle(
    id: string,
    cycleId: string | null
  ): Promise<SetIssueCycleResponse> {
    const { SET_ISSUE_CYCLE_MUTATION } = await import("./mutations.js");
    return this.execute<SetIssueCycleResponse>(SET_ISSUE_CYCLE_MUTATION, {
      id,
      input: { cycleId },
    });
  }

  // Create a custom view. `input` is the Linear CustomViewCreateInput
  // (name/description/teamId/filterData) assembled by the handler.
  async createView(
    input: Record<string, unknown>
  ): Promise<CreateViewResponse> {
    const { CREATE_VIEW_MUTATION } = await import("./mutations.js");
    return this.execute<CreateViewResponse>(CREATE_VIEW_MUTATION, { input });
  }

  // Update a custom view by UUID. `input` is a partial CustomViewUpdateInput.
  async updateView(
    id: string,
    input: Record<string, unknown>
  ): Promise<UpdateViewResponse> {
    const { UPDATE_VIEW_MUTATION } = await import("./mutations.js");
    return this.execute<UpdateViewResponse>(UPDATE_VIEW_MUTATION, { id, input });
  }

  // Delete a custom view by UUID.
  async deleteView(id: string): Promise<DeleteViewResponse> {
    const { DELETE_VIEW_MUTATION } = await import("./mutations.js");
    return this.execute<DeleteViewResponse>(DELETE_VIEW_MUTATION, { id });
  }

  // Create multiple issues
  async createIssues(issues: CreateIssueInput[]): Promise<IssueBatchResponse> {
    const { CREATE_BATCH_ISSUES } = await import("./mutations.js");
    return this.execute<IssueBatchResponse>(CREATE_BATCH_ISSUES, {
      input: { issues },
    });
  }

  // Create a project
  async createProject(input: ProjectInput): Promise<ProjectResponse> {
    const { CREATE_PROJECT } = await import("./mutations.js");
    return this.execute<ProjectResponse>(CREATE_PROJECT, { input });
  }

  // Helper method to create a project with associated issues
  async createProjectWithIssues(
    projectInput: ProjectInput,
    issues: CreateIssueInput[]
  ): Promise<ProjectResponse> {
    // Create project first
    const projectResult = await this.createProject(projectInput);

    if (!projectResult.projectCreate.success) {
      throw new Error("Failed to create project");
    }

    // Then create issues with project ID
    const issuesWithProject = issues.map((issue) => ({
      ...issue,
      projectId: projectResult.projectCreate.project.id,
    }));

    const issuesResult = await this.createIssues(issuesWithProject);

    if (!issuesResult.issueBatchCreate.success) {
      throw new Error("Failed to create issues");
    }

    return {
      projectCreate: projectResult.projectCreate,
      issueBatchCreate: issuesResult.issueBatchCreate,
    };
  }

  // Update a single issue
  async updateIssue(
    id: string,
    input: UpdateIssueInput
  ): Promise<UpdateIssueResponse> {
    const { UPDATE_ISSUE_MUTATION } = await import("./mutations.js");
    return this.execute<UpdateIssueResponse>(UPDATE_ISSUE_MUTATION, {
      id,
      input,
    });
  }

  // Bulk update issues
  async updateIssues(
    ids: string[],
    input: UpdateIssueInput
  ): Promise<Array<{ id: string; success: boolean; error?: string }>> {
    // Linear has no multi-id issueUpdate; fan out one mutation per id and
    // report each outcome so the caller can surface real success/failure
    // counts rather than assuming all succeeded.
    return Promise.all(
      ids.map(async (id) => {
        try {
          const r = (await this.updateIssue(
            id,
            input
          )) as UpdateIssueResponse;
          return { id, success: !!r.issueUpdate?.success };
        } catch (e) {
          return { id, success: false, error: (e as Error).message };
        }
      })
    );
  }

  // Create multiple labels
  async createIssueLabels(labels: LabelInput[]): Promise<LabelResponse> {
    const { CREATE_ISSUE_LABELS } = await import("./mutations.js");
    return this.execute<LabelResponse>(CREATE_ISSUE_LABELS, { labels });
  }

  // Search issues with pagination
  async searchIssues(
    filter: SearchIssuesInput["filter"],
    first: number = 50,
    after?: string,
    orderBy: string = "updatedAt"
  ): Promise<SearchIssuesResponse> {
    // Use GET_ISSUES_BY_IDENTIFIER for identifier searches
    if (filter?.identifier?.in) {
      const { GET_ISSUES_BY_IDENTIFIER } = await import("./queries.js");
      // Extract numbers from identifiers (e.g., "78" from "MIC-78") and convert to Float
      const numbers = filter.identifier.in.map((id) =>
        parseFloat(id.split("-")[1])
      );
      return this.execute<SearchIssuesResponse>(GET_ISSUES_BY_IDENTIFIER, {
        numbers,
      });
    }

    // Use regular search query for other filters
    const { SEARCH_ISSUES_QUERY } = await import("./queries.js");
    return this.execute<SearchIssuesResponse>(SEARCH_ISSUES_QUERY, {
      filter,
      first,
      after,
      orderBy,
    });
  }

  // Full-text search including comments, with snippet capping
  async searchIssuesInComments(
    term: string,
    filter: SearchIssuesInput["filter"],
    first: number = 25,
    after?: string,
    orderBy: string = "updatedAt",
    snippetSize: number = 200
  ): Promise<SearchIssuesResponse> {
    const { SEARCH_ISSUES_IN_COMMENTS_QUERY } = await import("./queries.js");
    const raw = await this.execute<{ searchIssues: SearchIssuesResponse["issues"] }>(
      SEARCH_ISSUES_IN_COMMENTS_QUERY,
      { term, filter, first, after, orderBy, snippetSize }
    );
    return { issues: raw.searchIssues };
  }

  // Full-text search using Linear's searchIssues endpoint
  async searchIssuesFulltext(
    term: string,
    filter: SearchIssuesInput["filter"],
    first: number = 50,
    after?: string,
    orderBy: string = "updatedAt"
  ): Promise<SearchIssuesResponse> {
    const { FULLTEXT_SEARCH_ISSUES_QUERY } = await import("./queries.js");
    const raw = await this.execute<{ searchIssues: SearchIssuesResponse["issues"] }>(
      FULLTEXT_SEARCH_ISSUES_QUERY,
      { term, filter, first, after, orderBy }
    );
    // Normalise to the same shape as searchIssues so callers stay consistent
    return { issues: raw.searchIssues };
  }

  // Get a single issue with full body + the most recent N comments.
  async getIssue(
    id: string,
    commentLimit: number = 5
  ): Promise<GetIssueResponse> {
    const { GET_ISSUE_QUERY } = await import("./queries.js");
    return this.execute<GetIssueResponse>(GET_ISSUE_QUERY, {
      id,
      commentLimit: Math.max(1, commentLimit),
    });
  }

  // Get a single issue's full comment thread, paginated (oldest-first).
  async getIssueComments(
    id: string,
    first: number = 50,
    after?: string
  ): Promise<GetIssueCommentsResponse> {
    const { GET_ISSUE_COMMENTS_QUERY } = await import("./queries.js");
    return this.execute<GetIssueCommentsResponse>(GET_ISSUE_COMMENTS_QUERY, {
      id,
      first,
      after,
    });
  }

  // Get formal Linear relations (blocks/related/duplicate) for an issue.
  // `id` may be a UUID or a human identifier (e.g. "ENG-123") — Linear's
  // issue(id:) resolves both.
  async getIssueRelations(id: string): Promise<GetIssueRelationsResponse> {
    const { GET_ISSUE_RELATIONS_QUERY } = await import("./queries.js");
    return this.execute<GetIssueRelationsResponse>(GET_ISSUE_RELATIONS_QUERY, {
      id,
    });
  }

  // Get an issue's activity history (state/assignee/priority/title/relation
  // changes). Comment additions are NOT part of Linear's issue history.
  async getIssueHistory(
    id: string,
    first: number = 50
  ): Promise<GetIssueHistoryResponse> {
    const { GET_ISSUE_HISTORY_QUERY } = await import("./queries.js");
    return this.execute<GetIssueHistoryResponse>(GET_ISSUE_HISTORY_QUERY, {
      id,
      first,
    });
  }

  // Create a formal relation between two issues. Both IDs must be UUIDs.
  async createIssueRelation(
    issueId: string,
    relatedIssueId: string,
    type: IssueRelationType
  ): Promise<CreateIssueRelationResponse> {
    const { CREATE_ISSUE_RELATION_MUTATION } = await import("./mutations.js");
    return this.execute<CreateIssueRelationResponse>(
      CREATE_ISSUE_RELATION_MUTATION,
      { input: { issueId, relatedIssueId, type } }
    );
  }

  // Delete a formal relation between two issues. `id` is the relation's own
  // UUID (from linear_get_issue_relations), not an issue id.
  async deleteIssueRelation(id: string): Promise<DeleteIssueRelationResponse> {
    const { DELETE_ISSUE_RELATION_MUTATION } = await import("./mutations.js");
    return this.execute<DeleteIssueRelationResponse>(
      DELETE_ISSUE_RELATION_MUTATION,
      { id }
    );
  }

  // List custom/saved views
  async listViews(first: number = 50): Promise<ListViewsResponse> {
    const { LIST_VIEWS_QUERY } = await import("./queries.js");
    return this.execute<ListViewsResponse>(LIST_VIEWS_QUERY, { first });
  }

  // Get the issues a custom view resolves to (applies the view's own filter).
  async getViewIssues(
    id: string,
    first: number = 50
  ): Promise<GetViewIssuesResponse> {
    const { GET_VIEW_ISSUES_QUERY } = await import("./queries.js");
    return this.execute<GetViewIssuesResponse>(GET_VIEW_ISSUES_QUERY, {
      id,
      first,
    });
  }

  // Get teams with their states and labels
  async getTeams(): Promise<TeamResponse> {
    const { GET_TEAMS_QUERY } = await import("./queries.js");
    return this.execute<TeamResponse>(GET_TEAMS_QUERY);
  }

  // Get current user info
  async getCurrentUser(): Promise<UserResponse> {
    const { GET_USER_QUERY } = await import("./queries.js");
    return this.execute<UserResponse>(GET_USER_QUERY);
  }

  // Get project info
  async getProject(id: string): Promise<ProjectResponse> {
    const { GET_PROJECT_QUERY } = await import("./queries.js");
    return this.execute<ProjectResponse>(GET_PROJECT_QUERY, { id });
  }

  // Search projects
  async searchProjects(
    filter?: ProjectFilter
  ): Promise<SearchProjectsResponse> {
    const { SEARCH_PROJECTS_QUERY } = await import("./queries.js");
    return this.execute<SearchProjectsResponse>(SEARCH_PROJECTS_QUERY, {
      filter,
    });
  }

  // Get a single document by id
  async getDocument(id: string): Promise<GetDocumentResponse> {
    const { GET_DOCUMENT_QUERY } = await import("./queries.js");
    return this.execute<GetDocumentResponse>(GET_DOCUMENT_QUERY, { id });
  }

  // List documents with optional filter, ordering, and cursor pagination
  async listDocuments(
    first: number,
    after?: string,
    filter?: DocumentFilter,
    orderBy: "createdAt" | "updatedAt" = "updatedAt",
    includeArchived: boolean = false
  ): Promise<ListDocumentsResponse> {
    const { LIST_DOCUMENTS_QUERY } = await import("./queries.js");
    return this.execute<ListDocumentsResponse>(LIST_DOCUMENTS_QUERY, {
      first,
      after,
      filter,
      orderBy,
      includeArchived,
    });
  }

  // Free-text document search
  async searchDocuments(
    term: string,
    first: number,
    after?: string,
    includeArchived: boolean = false
  ): Promise<ListDocumentsResponse> {
    const { SEARCH_DOCUMENTS_QUERY } = await import("./queries.js");
    const raw = await this.execute<{
      searchDocuments: ListDocumentsResponse["documents"];
    }>(SEARCH_DOCUMENTS_QUERY, { term, first, after, includeArchived });
    return { documents: raw.searchDocuments };
  }

  // Create a document
  async createDocument(
    input: Record<string, unknown>
  ): Promise<DocumentMutationResponse> {
    const { CREATE_DOCUMENT_MUTATION } = await import("./mutations.js");
    return this.execute<DocumentMutationResponse>(CREATE_DOCUMENT_MUTATION, {
      input,
    });
  }

  // Update a document
  async updateDocument(
    id: string,
    input: Record<string, unknown>
  ): Promise<DocumentMutationResponse> {
    const { UPDATE_DOCUMENT_MUTATION } = await import("./mutations.js");
    return this.execute<DocumentMutationResponse>(UPDATE_DOCUMENT_MUTATION, {
      id,
      input,
    });
  }

  // Delete a single issue
  async deleteIssue(id: string): Promise<DeleteIssueResponse> {
    const { DELETE_ISSUE_MUTATION } = await import("./mutations.js");
    return this.execute<DeleteIssueResponse>(DELETE_ISSUE_MUTATION, {
      id,
    });
  }

  // Get project milestones
  async getProjectMilestones(
    projectId: string,
    filter?: Record<string, any>,
    first?: number,
    after?: string,
    last?: number,
    before?: string,
    includeArchived?: boolean,
    orderBy?: string
  ): Promise<GetProjectMilestonesResponse> {
    const { GET_PROJECT_MILESTONES } = await import("./queries.js");
    return this.execute<GetProjectMilestonesResponse>(GET_PROJECT_MILESTONES, {
      projectId,
      filter,
      first,
      after,
      last,
      before,
      includeArchived,
      orderBy,
    });
  }

  // Create a project milestone
  async createProjectMilestone(input: {
    projectId: string;
    name: string;
    description?: string;
    targetDate?: string;
    sortOrder?: number;
  }): Promise<{
    projectMilestoneCreate: { success: boolean; milestone: ProjectMilestone };
  }> {
    const { CREATE_PROJECT_MILESTONE } = await import("./mutations.js");
    return this.execute(CREATE_PROJECT_MILESTONE, { input });
  }

  // Update a project milestone
  async updateProjectMilestone(
    id: string,
    input: {
      name?: string;
      description?: string;
      targetDate?: string;
      sortOrder?: number;
    }
  ): Promise<{
    projectMilestoneUpdate: { success: boolean; milestone: ProjectMilestone };
  }> {
    const { UPDATE_PROJECT_MILESTONE } = await import("./mutations.js");
    return this.execute(UPDATE_PROJECT_MILESTONE, { id, input });
  }

  // Delete a project milestone
  async deleteProjectMilestone(
    id: string
  ): Promise<{ projectMilestoneDelete: { success: boolean } }> {
    const { DELETE_PROJECT_MILESTONE } = await import("./mutations.js");
    return this.execute(DELETE_PROJECT_MILESTONE, { id });
  }
}
