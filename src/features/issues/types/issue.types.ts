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

export interface SearchIssuesInput {
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
  teamIds?: string[];
  assigneeIds?: string[];
  unassigned?: boolean; // Only issues with no assignee
  states?: string[];
  stateTypes?: string[]; // backlog|unstarted|started|completed|canceled
  priority?: number;
  projectId?: string; // Filter to a single project (UUID)
  labelIds?: string[]; // Issues having ANY of these label UUIDs
  labels?: string[]; // Issues having ANY of these label names
  updatedSince?: string; // ISO-8601; updatedAt >= this
  createdSince?: string; // ISO-8601; createdAt >= this
  blocked?: boolean; // Only issues blocked by another (hasBlockedByRelations)
  blocking?: boolean; // Only issues blocking another (hasBlockingRelations)
  parentId?: string; // Subtasks of this parent (UUID)
  noParent?: boolean; // Only top-level issues (no parent)
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
}
