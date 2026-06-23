import { BaseToolResponse } from "../../../core/interfaces/tool-handler.interface.js";

/**
 * Input types for issue operations
 */

export interface CreateIssueInput {
  title: string;
  description: string;
  teamId: string;
  parentId?: string; // UUID of the parent issue
  labelIds?: string[]; // Label UUIDs to apply
  assigneeId?: string;
  priority?: number;
  projectId?: string;
  createAsUser?: string; // Name to display for the created issue
  displayIconUrl?: string; // URL of the avatar to display
}

export interface CreateIssuesInput {
  issues: CreateIssueInput[];
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  assigneeId?: string;
  priority?: number;
  projectId?: string;
  stateId?: string;
}

export interface BulkUpdateIssuesInput {
  issueIds: string[];
  update: UpdateIssueInput;
}

// Inherits the full flat filter vocabulary (teamIds, states/notStates,
// labels/notLabels/noLabels, projectId/noProject, updatedSince/updatedBefore,
// parentId/parentStates/notParentStates, etc.) from IssueFilterParams so the
// search tool stays symmetric with the view tools.
export interface SearchIssuesInput extends IssueFilterParams {
  query?: string;
  filter?: {
    project?: {
      id?: {
        eq?: string;
      };
    };
    identifier?: {
      in: string[];
    };
  };
  lean?: boolean; // Omit issue descriptions from results (default true)
  first?: number;
  after?: string;
  orderBy?: string;
}

export interface SearchIssuesInCommentsInput {
  query: string;
  teamIds?: string[];
  assigneeIds?: string[];
  unassigned?: boolean;
  states?: string[];
  stateTypes?: string[];
  priority?: number;
  projectId?: string;
  labelIds?: string[];
  labels?: string[];
  updatedSince?: string;
  createdSince?: string;
  blocked?: boolean;
  blocking?: boolean;
  parentId?: string;
  noParent?: boolean;
  first?: number;
  after?: string;
  snippetSize?: number;
}

export interface SearchIssuesByIdentifierInput {
  identifiers: string[];
}

export interface GetIssueInput {
  identifier: string;
  commentLimit?: number; // Most-recent comments to include (default 2)
}

export interface GetIssueCommentsInput {
  identifier: string;
  first?: number;
  after?: string;
}

interface IssueCommentNode {
  id: string;
  body: string;
  user?: { id: string; name: string; email?: string } | null;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  resolvingComment?: { id: string; body?: string } | null;
}

export interface GetIssueResponse {
  issue:
    | (Issue & {
        description?: string | null;
        comments?: {
          pageInfo: { hasNextPage: boolean };
          nodes: IssueCommentNode[];
        };
      })
    | null;
}

export interface GetIssueCommentsResponse {
  issue: {
    id: string;
    identifier: string;
    comments: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: IssueCommentNode[];
    };
  } | null;
}

export interface GetIssueRelationsInput {
  identifier: string;
}

export interface GetIssueHistoryInput {
  identifier: string;
  first?: number;
}

export type IssueRelationType = "blocks" | "related" | "duplicate";

export interface CreateIssueRelationInput {
  issueId: string; // Issue identifier (e.g. "ENG-123") OR UUID
  relatedIssueId: string; // Related issue identifier OR UUID
  type: IssueRelationType;
}

export interface DeleteIssueInput {
  id: string;
}

export interface EditIssueInput {
  issueId: string; // Required: The UUID of the issue to update
  title?: string;
  description?: string; // Markdown format
  stateId?: string; // UUID of the target state
  priority?: number; // 0=None, 1=Urgent, 2=High, 3=Normal, 4=Low
  assigneeId?: string; // UUID of the user
  labelIds?: string[]; // Array of label UUIDs (replaces existing)
  projectId?: string; // UUID of the project
  projectMilestoneId?: string; // UUID of the project milestone
  estimate?: number; // Point estimate
  dueDate?: string; // Date in "YYYY-MM-DD" format
  parentId?: string; // UUID of the parent issue
  sortOrder?: number; // Position relative to other issues
}

/**
 * Response types for issue operations
 */

export interface Issue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  state: {
    id: string;
    name: string;
    type: string;
    color: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    name: string;
  };
  priority?: number;
  labels?: {
    nodes: {
      id: string;
      name: string;
      color: string;
    }[];
  };
  parent?: {
    id: string;
    identifier: string;
    title: string;
  };
  children?: {
    nodes: {
      id: string;
      identifier: string;
      title: string;
      state?: {
        name: string;
      };
    }[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateIssueResponse {
  issueCreate: {
    success: boolean;
    issue?: Issue;
  };
}

export interface CreateIssuesResponse {
  issueCreate: {
    success: boolean;
    issues: Issue[];
  };
}

export interface IssueBatchResponse {
  issueBatchCreate: {
    success: boolean;
    issues: Issue[];
    lastSyncId: number;
  };
}

export interface UpdateIssueResponse {
  issueUpdate: {
    success: boolean;
    issue: Issue;
  };
}

export interface SearchIssuesResponse {
  issues: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    nodes: Issue[];
  };
}

export interface DeleteIssueResponse {
  issueDelete: {
    success: boolean;
  };
}

interface RelationIssueRef {
  id: string;
  identifier: string;
  title: string;
  state?: {
    name: string;
    type: string;
  };
}

export interface GetIssueRelationsResponse {
  issue: {
    id: string;
    identifier: string;
    title: string;
    relations: {
      nodes: { id: string; type: string; relatedIssue: RelationIssueRef }[];
    };
    inverseRelations: {
      nodes: { id: string; type: string; issue: RelationIssueRef }[];
    };
  } | null;
}

export interface GetIssueHistoryResponse {
  issue: {
    id: string;
    identifier: string;
    history: {
      nodes: Record<string, unknown>[];
    };
  } | null;
}

export interface ListViewsInput {
  first?: number;
}

export interface GetViewIssuesInput {
  id: string;
  first?: number;
}

export interface ListViewsResponse {
  customViews: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: {
      id: string;
      name: string;
      description?: string | null;
      shared: boolean;
      team?: { id: string; key: string; name: string } | null;
      creator?: { id: string; name: string } | null;
      updatedAt: string;
    }[];
  };
}

export interface GetViewIssuesResponse {
  customView: {
    id: string;
    name: string;
    issues: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Issue[];
    };
  } | null;
}

/**
 * The flat filter vocabulary shared by issue search and custom-view
 * create/update — fed to buildIssueFilter to produce a Linear IssueFilter.
 * SearchIssuesInput declares these same fields independently and stays
 * structurally compatible.
 */
export interface IssueFilterParams {
  teamIds?: string[];
  assigneeIds?: string[];
  unassigned?: boolean;
  states?: string[];
  notStates?: string[]; // Exclude these workflow state names (state.name nin)
  stateTypes?: string[];
  priority?: number;
  projectId?: string;
  noProject?: boolean; // project = none (project.null)
  labelIds?: string[];
  labels?: string[];
  notLabels?: string[]; // issue has NONE of these label names (labels.every.name.nin)
  noLabels?: boolean; // zero labels (labels.length eq 0)
  updatedSince?: string;
  updatedBefore?: string; // updatedAt <= this (ISO-8601 or relative duration)
  createdSince?: string;
  blocked?: boolean;
  blocking?: boolean;
  parentId?: string;
  noParent?: boolean;
  parentStates?: string[]; // parent's workflow-state name in [...] (parent.state.name.in)
  notParentStates?: string[]; // parent's state name nin [...] (parent.state.name.nin)
}

export interface CreateViewInput extends IssueFilterParams {
  name: string;
  description?: string;
  teamId?: string; // Scope to a team; omit for a workspace-shared view.
}

export interface UpdateViewInput extends IssueFilterParams {
  id: string; // Custom view UUID
  name?: string;
  description?: string;
  teamId?: string;
}

export interface DeleteViewInput {
  id: string;
}

interface ViewMutationResult {
  success: boolean;
  customView: { id: string; name: string };
}

export interface CreateViewResponse {
  customViewCreate: ViewMutationResult;
}

export interface UpdateViewResponse {
  customViewUpdate: ViewMutationResult;
}

export interface DeleteViewResponse {
  customViewDelete: { success: boolean };
}

export interface CreateIssueRelationResponse {
  issueRelationCreate: {
    success: boolean;
    issueRelation: {
      id: string;
      type: string;
      issue: { identifier: string; title: string };
      relatedIssue: { identifier: string; title: string };
    };
  };
}

/**
 * Handler method types
 */

export interface IssueHandlerMethods {
  handleCreateIssue(args: CreateIssueInput): Promise<BaseToolResponse>;
  handleCreateIssues(args: CreateIssuesInput): Promise<BaseToolResponse>;
  handleBulkUpdateIssues(
    args: BulkUpdateIssuesInput
  ): Promise<BaseToolResponse>;
  handleSearchIssues(args: SearchIssuesInput): Promise<BaseToolResponse>;
  handleSearchIssuesInComments(
    args: SearchIssuesInCommentsInput
  ): Promise<BaseToolResponse>;
  handleSearchIssuesByIdentifier(
    args: SearchIssuesByIdentifierInput
  ): Promise<BaseToolResponse>;
  handleDeleteIssue(args: DeleteIssueInput): Promise<BaseToolResponse>;
  handleGetIssueRelations(
    args: GetIssueRelationsInput
  ): Promise<BaseToolResponse>;
  handleGetIssueHistory(args: GetIssueHistoryInput): Promise<BaseToolResponse>;
  handleCreateIssueRelation(
    args: CreateIssueRelationInput
  ): Promise<BaseToolResponse>;
  handleListViews(args: ListViewsInput): Promise<BaseToolResponse>;
  handleGetViewIssues(args: GetViewIssuesInput): Promise<BaseToolResponse>;
  handleCreateView(args: CreateViewInput): Promise<BaseToolResponse>;
  handleUpdateView(args: UpdateViewInput): Promise<BaseToolResponse>;
  handleDeleteView(args: DeleteViewInput): Promise<BaseToolResponse>;
  handleGetIssueComments(
    args: GetIssueCommentsInput
  ): Promise<BaseToolResponse>;
}
