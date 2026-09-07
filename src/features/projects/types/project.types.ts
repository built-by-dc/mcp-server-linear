/**
 * Project operation types
 * These types define the structure for project-related operations in Linear
 */

/**
 * Input for creating a new project
 * @example
 * ```typescript
 * const projectInput: ProjectInput = {
 *   name: "Q1 Planning",
 *   description: "Q1 2025 Planning Project",
 *   teamIds: ["team-id-1", "team-id-2"], // Required: Array of team IDs this project belongs to
 *   state: "started" // Optional: Project state
 * };
 * ```
 */
export interface ProjectInput {
  /** The name of the project */
  name: string;

  /** Optional description of the project */
  description?: string;

  /**
   * Array of team IDs this project belongs to
   * @required
   * Note: Linear API requires teamIds (array) not teamId (single value)
   */
  teamIds: string[];

  /** Optional project state */
  state?: string;
}

export interface ProjectResponse {
  projectCreate: {
    success: boolean;
    project: {
      id: string;
      name: string;
      url: string;
    };
    lastSyncId: number;
  };
  issueBatchCreate?: {
    success: boolean;
    issues: Array<{
      id: string;
      identifier: string;
      title: string;
      url: string;
    }>;
    lastSyncId: number;
  };
}

/**
 * Filter for project milestone collections
 */
export interface ProjectMilestoneCollectionFilter {
  every?: ProjectMilestoneFilter;
  some?: ProjectMilestoneFilter;
  none?: ProjectMilestoneFilter;
}

export interface ProjectMilestone {
  id: string;
  name: string;
  description?: string;
  targetDate?: string;
  progress: number;
  sortOrder: number;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  currentProgress: Record<string, any>;
  progressHistory: Record<string, any>;
  descriptionState?: string;
  documentContent?: {
    content: string;
  };
  project: {
    id: string;
    name: string;
  };
  issues?: {
    nodes: Array<{
      id: string;
      identifier: string;
      title: string;
    }>;
  };
}

export interface ProjectMilestoneConnection {
  nodes: ProjectMilestone[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string;
  };
}

/**
 * Filter for project milestone
 */
export interface ProjectMilestoneFilter {
  id?: { eq?: string; in?: string[] };
  name?: { eq?: string; contains?: string };
  targetDate?: { eq?: string; lt?: string; gt?: string };
  completed?: { eq?: boolean };
  createdAt?: { gt?: string; lt?: string };
  updatedAt?: { gt?: string; lt?: string };
}

/**
 * Filter for project updates collection
 */
export interface ProjectUpdatesCollectionFilter {
  every?: ProjectUpdateFilter;
  some?: ProjectUpdateFilter;
  none?: ProjectUpdateFilter;
}

/**
 * Filter for project update
 */
export interface ProjectUpdateFilter {
  id?: string;
  // Add other update fields as needed
}

/**
 * Filter for project status
 */
export interface ProjectStatusFilter {
  eq?: string;
  in?: string[];
  neq?: string;
  nin?: string[];
}

/**
 * Project filtering options
 */
export interface ProjectFilter {
  projectMilestones?: ProjectMilestoneCollectionFilter;
  projectUpdates?: ProjectUpdatesCollectionFilter;
  nextProjectMilestone?: ProjectMilestoneFilter;
  completedProjectMilestones?: ProjectMilestoneCollectionFilter;
  and?: ProjectFilter[];
  or?: ProjectFilter[];
  status?: ProjectStatusFilter;
}

export interface SearchProjectsResponse {
  projects: {
    nodes: Array<{
      id: string;
      name: string;
      description?: string;
      url: string;
      state: string;
      teams: {
        nodes: Array<{
          id: string;
          name: string;
        }>;
      };
      projectMilestones?: ProjectMilestoneConnection;
    }>;
  };
}

export interface GetProjectMilestonesResponse {
  projectMilestones: ProjectMilestoneConnection;
}

/**
 * A project as returned by the project mutations.
 */
export interface ProjectSummary {
  id: string;
  name: string;
  slugId: string;
  url: string;
  description?: string;
  priority?: number;
  status?: { id: string; name: string; type: string };
  lead?: { id: string; name: string } | null;
  teams?: { nodes: Array<{ id: string; key: string; name: string }> };
  startDate?: string;
  targetDate?: string;
  completedAt?: string;
  canceledAt?: string;
  archivedAt?: string;
  updatedAt?: string;
}

/**
 * Fields accepted when updating a project.
 * Mirrors the useful subset of Linear's ProjectUpdateInput. `trashed` is
 * deliberately excluded - use deleteProject/restoreProject instead.
 */
export interface ProjectUpdateFields {
  name?: string;
  description?: string;
  content?: string;
  statusId?: string;
  leadId?: string;
  memberIds?: string[];
  teamIds?: string[];
  labelIds?: string[];
  startDate?: string;
  targetDate?: string;
  priority?: number;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateProjectResponse {
  projectUpdate: {
    success: boolean;
    project: ProjectSummary;
  };
}

export interface DeleteProjectResponse {
  projectDelete: {
    success: boolean;
  };
}

export interface RestoreProjectResponse {
  projectUnarchive: {
    success: boolean;
    entity: ProjectSummary;
  };
}
