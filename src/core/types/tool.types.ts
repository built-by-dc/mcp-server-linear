/**
 * This file contains the schema definitions for all MCP tools exposed by the Linear server.
 * These schemas define the input parameters and validation rules for each tool.
 */

const getToolName = (baseName: string): string => {
  const prefix = process.env.TOOL_PREFIX;
  return prefix ? `${prefix}_${baseName}` : baseName;
};

const getToolDescription = (description: string): string => {
  const prefix = process.env.TOOL_PREFIX;
  return prefix
    ? `For '${prefix}' Linear workspace: ${description}`
    : description;
};

// Flat filter vocabulary shared by view create/update — mirrors the
// linear_search_issues filter knobs (buildIssueFilter consumes both).
const VIEW_FILTER_PROPERTIES = {
  teamIds: {
    type: "array",
    items: { type: "string" },
    description: "Filter by team UUIDs",
    optional: true,
  },
  assigneeIds: {
    type: "array",
    items: { type: "string" },
    description: "Filter by assignee UUIDs",
    optional: true,
  },
  unassigned: {
    type: "boolean",
    description: "Only issues with no assignee. Overrides assigneeIds.",
    optional: true,
  },
  states: {
    type: "array",
    items: { type: "string" },
    description: "Include only these workflow state names",
    optional: true,
  },
  notStates: {
    type: "array",
    items: { type: "string" },
    description:
      "Exclude these workflow state names (e.g. ['Done','Cancelled','Duplicate','In Review']). Combines with states/stateTypes.",
    optional: true,
  },
  stateTypes: {
    type: "array",
    items: {
      type: "string",
      enum: ["backlog", "unstarted", "started", "completed", "canceled"],
    },
    description:
      "Filter by workflow state TYPE (team-independent). Combines with `states`.",
    optional: true,
  },
  priority: {
    type: "number",
    description: "Filter by priority (0=None,1=Urgent,2=High,3=Normal,4=Low)",
    optional: true,
  },
  projectId: {
    type: "string",
    description: "Filter to a single project (UUID)",
    optional: true,
  },
  noProject: {
    type: "boolean",
    description:
      "Only issues with no project assigned. Overrides projectId.",
    optional: true,
  },
  labels: {
    type: "array",
    items: { type: "string" },
    description: "Filter to issues having ANY of these label names",
    optional: true,
  },
  labelIds: {
    type: "array",
    items: { type: "string" },
    description:
      "Filter to issues having ANY of these label UUIDs. Takes precedence over `labels`.",
    optional: true,
  },
  notLabels: {
    type: "array",
    items: { type: "string" },
    description:
      "Exclude issues carrying ANY of these label names (issue must have NONE of them; unlabelled issues pass). Combines with label includes.",
    optional: true,
  },
  noLabels: {
    type: "boolean",
    description:
      "Only issues with zero labels. Exclusive — overrides all other label filters.",
    optional: true,
  },
  updatedSince: {
    type: "string",
    description:
      "Lower bound: only issues updated on/after this (ISO-8601 timestamp, e.g. 2026-05-23T00:00:00Z). Pairs with updatedBefore for a window.",
    optional: true,
  },
  updatedBefore: {
    type: "string",
    description:
      "Upper bound: only issues updated on/before this (ISO-8601 timestamp, OR a relative duration like '-P7D'). Combine with updatedSince to express 'active in window X but not since Y' (stale work).",
    optional: true,
  },
  updatedWithinDays: {
    type: "number",
    description:
      "Sugar for a rolling lower bound: issues updated within the last N days (emits updatedAt >= -PND). Saved views roll forward automatically. Overridden by updatedSince.",
    optional: true,
  },
  updatedMoreThanDaysAgo: {
    type: "number",
    description:
      "Sugar for a rolling upper bound: issues NOT touched in the last N days (emits updatedAt <= -PND) — i.e. 'stale > N days'. Saved views roll forward automatically. Overridden by updatedBefore.",
    optional: true,
  },
  createdSince: {
    type: "string",
    description: "Only issues created on/after this ISO-8601 timestamp",
    optional: true,
  },
  blocked: {
    type: "boolean",
    description: "Only issues blocked by another issue",
    optional: true,
  },
  blocking: {
    type: "boolean",
    description: "Only issues blocking another issue",
    optional: true,
  },
  parentId: {
    type: "string",
    description: "Only subtasks of this parent issue (UUID)",
    optional: true,
  },
  noParent: {
    type: "boolean",
    description: "Only top-level issues (no parent). Overrides parentId.",
    optional: true,
  },
  parentStates: {
    type: "array",
    items: { type: "string" },
    description:
      "Only subtasks whose PARENT is in one of these workflow-state names (e.g. ['Done','Canceled'] surfaces children orphaned by a closed parent).",
    optional: true,
  },
  notParentStates: {
    type: "array",
    items: { type: "string" },
    description:
      "Only subtasks whose parent is NOT in any of these state names.",
    optional: true,
  },
} as const;

export const toolSchemas = {
  // Linear Authentication Tools
  // [getToolName('linear_auth')]: {
  //   name: getToolName('linear_auth'),
  //   description: getToolDescription("Initialize OAuth flow with Linear"),
  //   inputSchema: {
  //     type: "object",
  //     properties: {
  //       clientId: {
  //         type: "string",
  //         description: "Linear OAuth client ID",
  //       },
  //       clientSecret: {
  //         type: "string",
  //         description: "Linear OAuth client secret",
  //       },
  //       redirectUri: {
  //         type: "string",
  //         description: "OAuth redirect URI",
  //       },
  //     },
  //     required: ["clientId", "clientSecret", "redirectUri"],
  //   },
  // },

  [getToolName("linear_auth_callback")]: {
    name: getToolName("linear_auth_callback"),
    description: getToolDescription("Handle OAuth callback"),
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "OAuth authorization code",
        },
      },
      required: ["code"],
    },
  },

  // Linear Issue Management Tools
  [getToolName("linear_create_issue")]: {
    name: getToolName("linear_create_issue"),
    description: getToolDescription("Create a new issue in Linear"),
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Issue title",
        },
        description: {
          type: "string",
          description: "Issue description",
        },
        teamId: {
          type: "string",
          description: "Team ID (UUID)",
        },
        parentId: {
          type: "string",
          description: "Parent issue ID (UUID, not issue identifier)",
          optional: true,
        },
        labelIds: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "Label UUIDs to apply, eg ['a1eb5aed-7425-4ea5-98ec-dfab52381e0e']",
          optional: true,
        },
        assigneeId: {
          type: "string",
          description: "Assignee user ID (UUID)",
          optional: true,
        },
        priority: {
          type: "number",
          description: "Issue priority (0-4)",
          optional: true,
        },
        createAsUser: {
          type: "string",
          description: "Name to display for the created issue",
          optional: true,
        },
        displayIconUrl: {
          type: "string",
          description: "URL of the avatar to display",
          optional: true,
        },
      },
      required: ["title", "description", "teamId"],
    },
  },

  // Linear Project Management Tools
  [getToolName("linear_create_project_with_issues")]: {
    name: getToolName("linear_create_project_with_issues"),
    description: getToolDescription(
      "Create a new project with associated issues. Note: Project requires teamIds (array) not teamId (single value)."
    ),
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Project name",
            },
            description: {
              type: "string",
              description: "Project description (optional)",
            },
            teamIds: {
              type: "array",
              items: {
                type: "string",
              },
              description:
                "Array of team IDs this project belongs to (Required). Use linear_get_teams to get available team IDs.",
              minItems: 1,
            },
          },
          required: ["name", "teamIds"],
        },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Issue title",
              },
              description: {
                type: "string",
                description: "Issue description",
              },
              teamId: {
                type: "string",
                description: "Team ID (must match one of the project teamIds)",
              },
            },
            required: ["title", "description", "teamId"],
          },
          description: "List of issues to create with this project",
        },
      },
      required: ["project", "issues"],
    },
    examples: [
      {
        description: "Create a project with a single team and issue",
        value: {
          project: {
            name: "Q1 Planning",
            description: "Q1 2025 Planning Project",
            teamIds: ["eng-team-id"],
          },
          issues: [
            {
              title: "Project Setup",
              description: "Initial project setup tasks",
              teamId: "eng-team-id",
            },
          ],
        },
      },
      {
        description: "Create a project with multiple teams",
        value: {
          project: {
            name: "Cross-team Initiative",
            description: "Project spanning multiple teams",
            teamIds: ["eng-team-id", "design-team-id"],
          },
          issues: [
            {
              title: "Engineering Tasks",
              description: "Tasks for engineering team",
              teamId: "eng-team-id",
            },
            {
              title: "Design Tasks",
              description: "Tasks for design team",
              teamId: "design-team-id",
            },
          ],
        },
      },
    ],
  },

  [getToolName("linear_bulk_update_issues")]: {
    name: getToolName("linear_bulk_update_issues"),
    description: getToolDescription("Update multiple issues at once"),
    inputSchema: {
      type: "object",
      properties: {
        issueIds: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "List of issue UUIDs to update (not issue identifiers like 'ENG-123')",
        },
        update: {
          type: "object",
          properties: {
            stateId: {
              type: "string",
              description: "New state ID",
              optional: true,
            },
            assigneeId: {
              type: "string",
              description: "New assignee ID",
              optional: true,
            },
            priority: {
              type: "number",
              description: "New priority (0-4)",
              optional: true,
            },
          },
        },
      },
      required: ["issueIds", "update"],
    },
  },

  [getToolName("linear_edit_issue")]: {
    name: getToolName("linear_edit_issue"),
    description: getToolDescription(
      "Edit an existing issue, updating any of its fields. Note: When setting projectMilestoneId, you must also set projectId."
    ),
    inputSchema: {
      type: "object",
      properties: {
        issueId: {
          type: "string",
          description: "Required: The UUID of the issue to update",
        },
        title: {
          type: "string",
          description: "The issue title",
          optional: true,
        },
        description: {
          type: "string",
          description: "The issue description in markdown format",
          optional: true,
        },
        stateId: {
          type: "string",
          description: "UUID of the target state",
          optional: true,
        },
        priority: {
          type: "number",
          description:
            "Issue priority (0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)",
          optional: true,
        },
        assigneeId: {
          type: "string",
          description: "UUID of the user to assign the issue to",
          optional: true,
        },
        labelIds: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Array of label UUIDs (replaces existing labels)",
          optional: true,
        },
        projectId: {
          type: "string",
          description: "UUID of the project to associate with the issue",
          optional: true,
        },
        projectMilestoneId: {
          type: "string",
          description:
            "UUID of the project milestone to associate with the issue. Note: Requires projectId to be set when using this field",
          optional: true,
        },
        estimate: {
          type: "number",
          description: "The estimated complexity points for the issue",
          optional: true,
        },
        dueDate: {
          type: "string",
          description: "The due date in YYYY-MM-DD format",
          optional: true,
        },
        parentId: {
          type: "string",
          description: "UUID of the parent issue",
          optional: true,
        },
        sortOrder: {
          type: "number",
          description: "Position of the issue relative to other issues",
          optional: true,
        },
      },
      required: ["issueId"],
    },
  },

  // Linear Search Tools
  [getToolName("linear_search_issues")]: {
    name: getToolName("linear_search_issues"),
    description: getToolDescription(
      "Search for issues with filtering and pagination"
    ),
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query string",
          optional: true,
        },
        // Full filter vocabulary, symmetric with linear_create_view /
        // linear_update_view (includes notStates, notLabels, noLabels,
        // noProject, parentStates/notParentStates, updatedBefore).
        ...VIEW_FILTER_PROPERTIES,
        lean: {
          type: "boolean",
          description:
            "Omit issue descriptions from results (default true) to protect the context window. Set false to include full bodies.",
          optional: true,
        },
        first: {
          type: "number",
          description: "Number of issues to return (default: 50)",
          optional: true,
        },
        after: {
          type: "string",
          description: "Cursor for pagination",
          optional: true,
        },
        orderBy: {
          type: "string",
          description: "Field to order by (default: updatedAt)",
          optional: true,
        },
      },
    },
  },

  [getToolName("linear_search_issues_in_comments")]: {
    name: getToolName("linear_search_issues_in_comments"),
    description: getToolDescription(
      "Search issues by keyword, including comment content. Returns matched issues with short snippets of matching text. Use when searching for a cross-reference or specific text that may appear in comments rather than the issue body."
    ),
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term to match against issue titles, descriptions, and comments",
        },
        teamIds: {
          type: "array",
          items: { type: "string" },
          description: "Filter by team IDs",
          optional: true,
        },
        assigneeIds: {
          type: "array",
          items: { type: "string" },
          description: "Filter by assignee IDs",
          optional: true,
        },
        states: {
          type: "array",
          items: { type: "string" },
          description: "Filter by state names",
          optional: true,
        },
        priority: {
          type: "number",
          description: "Filter by priority (0-4)",
          optional: true,
        },
        projectId: {
          type: "string",
          description: "Filter to a single project (UUID)",
          optional: true,
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Filter to issues having ANY of these label names",
          optional: true,
        },
        labelIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Filter to issues having ANY of these label UUIDs. Takes precedence over `labels`.",
          optional: true,
        },
        unassigned: {
          type: "boolean",
          description: "Only issues with no assignee. Overrides assigneeIds.",
          optional: true,
        },
        stateTypes: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "backlog",
              "unstarted",
              "started",
              "completed",
              "canceled",
            ],
          },
          description:
            "Filter by workflow state TYPE (team-independent). Combines with `states`.",
          optional: true,
        },
        updatedSince: {
          type: "string",
          description:
            "Only issues updated on/after this ISO-8601 timestamp",
          optional: true,
        },
        createdSince: {
          type: "string",
          description: "Only issues created on/after this ISO-8601 timestamp",
          optional: true,
        },
        blocked: {
          type: "boolean",
          description: "Only issues blocked by another issue",
          optional: true,
        },
        blocking: {
          type: "boolean",
          description: "Only issues that block another issue",
          optional: true,
        },
        parentId: {
          type: "string",
          description: "Only subtasks of this parent issue (UUID)",
          optional: true,
        },
        noParent: {
          type: "boolean",
          description: "Only top-level issues (no parent). Overrides parentId.",
          optional: true,
        },
        first: {
          type: "number",
          description: "Number of issues to return (default: 25)",
          optional: true,
        },
        after: {
          type: "string",
          description: "Cursor for pagination",
          optional: true,
        },
        snippetSize: {
          type: "number",
          description: "Max characters of matching comment text to return per result (default: 200)",
          optional: true,
        },
      },
      required: ["query"],
    },
  },

  [getToolName("linear_search_issues_by_identifier")]: {
    name: getToolName("linear_search_issues_by_identifier"),
    description: getToolDescription(
      'Search for issues by their identifiers (e.g., ["ENG-78", "ENG-79"])'
    ),
    inputSchema: {
      type: "object",
      properties: {
        identifiers: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Array of issue identifiers to search for",
        },
      },
      required: ["identifiers"],
    },
  },

  [getToolName("linear_get_issue")]: {
    name: getToolName("linear_get_issue"),
    description: getToolDescription(
      "Get a single issue: full body, metadata, parent/child subtasks, cross-linked issue identifiers, and the most recent comments (default 2, newest-first, long bodies truncated). Older/full comments are signalled by a `hasMore` flag — page them with linear_get_issue_comments. Raise commentLimit to pull more inline."
    ),
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description: "Issue identifier (e.g., 'ENG-123')",
        },
        commentLimit: {
          type: "number",
          description:
            "Number of most-recent comments to include (default 2). Set higher to pull more of the thread inline.",
          optional: true,
        },
      },
      required: ["identifier"],
    },
  },

  [getToolName("linear_get_issue_comments")]: {
    name: getToolName("linear_get_issue_comments"),
    description: getToolDescription(
      "Get the full comment thread for an issue, paginated (oldest-first). Use after linear_get_issue when its `comments.hasMore` is true or you need the complete discussion history."
    ),
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description: "Issue identifier (e.g., 'ENG-123')",
        },
        first: {
          type: "number",
          description: "Comments per page (default 50)",
          optional: true,
        },
        after: {
          type: "string",
          description: "Pagination cursor (from prior pageInfo.endCursor)",
          optional: true,
        },
      },
      required: ["identifier"],
    },
  },

  [getToolName("linear_get_issue_relations")]: {
    name: getToolName("linear_get_issue_relations"),
    description: getToolDescription(
      "Get formal Linear relations for an issue: blocks, blocked-by, related, duplicate. Use to detect blocking deadlocks and existing links."
    ),
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description: "Issue identifier (e.g., 'ENG-123')",
        },
      },
      required: ["identifier"],
    },
  },

  [getToolName("linear_get_issue_history")]: {
    name: getToolName("linear_get_issue_history"),
    description: getToolDescription(
      "Get an issue's activity history (state changes, assignments, priority/title/relation changes) with timestamps. Note: comment additions are NOT included — use linear_get_issue for comments."
    ),
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description: "Issue identifier (e.g., 'ENG-123')",
        },
        first: {
          type: "number",
          description: "Max history entries to return (default 50)",
          optional: true,
        },
      },
      required: ["identifier"],
    },
  },

  [getToolName("linear_create_issue_relation")]: {
    name: getToolName("linear_create_issue_relation"),
    description: getToolDescription(
      "Create a formal relation between two issues. Accepts identifiers (e.g. 'ENG-123') or UUIDs. To make A block B, set issueId=A, relatedIssueId=B, type='blocks'."
    ),
    inputSchema: {
      type: "object",
      properties: {
        issueId: {
          type: "string",
          description: "Source issue identifier or UUID",
        },
        relatedIssueId: {
          type: "string",
          description: "Related issue identifier or UUID",
        },
        type: {
          type: "string",
          enum: ["blocks", "related", "duplicate"],
          description:
            "Relation type. 'blocks' = issueId blocks relatedIssueId. (No 'blocked-by' — reverse the args instead.)",
        },
      },
      required: ["issueId", "relatedIssueId", "type"],
    },
  },

  [getToolName("linear_list_views")]: {
    name: getToolName("linear_list_views"),
    description: getToolDescription(
      "List custom/saved Linear views with their IDs. Use to find a view's UUID before calling linear_get_view_issues."
    ),
    inputSchema: {
      type: "object",
      properties: {
        first: {
          type: "number",
          description: "Max views to return (default 50)",
          optional: true,
        },
      },
    },
  },

  [getToolName("linear_get_view_issues")]: {
    name: getToolName("linear_get_view_issues"),
    description: getToolDescription(
      "Get the issues a custom/saved view resolves to (the view's own filter applied). Get the view UUID from linear_list_views."
    ),
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Custom view UUID (from linear_list_views)",
        },
        first: {
          type: "number",
          description: "Max issues to return (default 50)",
          optional: true,
        },
      },
      required: ["id"],
    },
  },

  [getToolName("linear_create_view")]: {
    name: getToolName("linear_create_view"),
    description: getToolDescription(
      "Create a custom/saved Linear view. The filter is described with the same flat knobs as linear_search_issues (team/assignee/state/labels/project/parent/dates). Omit teamId for a workspace-shared view; provide it to scope to a team. An empty filter creates a view over all issues."
    ),
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "View name" },
        description: {
          type: "string",
          description: "Optional view description",
          optional: true,
        },
        teamId: {
          type: "string",
          description:
            "Scope the view to this team (UUID). Omit for a workspace-shared view.",
          optional: true,
        },
        shared: {
          type: "boolean",
          description:
            "Shared (team-visible in the Linear Views nav) vs private. API-created views default to private and DON'T appear in the sidebar for anyone — set true for team-visible loop instruments.",
          optional: true,
        },
        ...VIEW_FILTER_PROPERTIES,
      },
      required: ["name"],
    },
  },

  [getToolName("linear_update_view")]: {
    name: getToolName("linear_update_view"),
    description: getToolDescription(
      "Update a custom view by UUID. Only provided fields change. Supplying ANY filter knob replaces the view's whole filter (no partial merge); omit all filter knobs to rename/re-describe without touching the filter."
    ),
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Custom view UUID (from linear_list_views)",
        },
        name: { type: "string", description: "New name", optional: true },
        description: {
          type: "string",
          description: "New description",
          optional: true,
        },
        teamId: {
          type: "string",
          description: "Re-scope to this team (UUID)",
          optional: true,
        },
        shared: {
          type: "boolean",
          description:
            "Set true to make the view team-visible in the Linear Views nav (API-created views default private/hidden).",
          optional: true,
        },
        ...VIEW_FILTER_PROPERTIES,
      },
      required: ["id"],
    },
  },

  [getToolName("linear_delete_view")]: {
    name: getToolName("linear_delete_view"),
    description: getToolDescription(
      "Delete a custom view by UUID. Get the UUID from linear_list_views."
    ),
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Custom view UUID (from linear_list_views)",
        },
      },
      required: ["id"],
    },
  },

  // Linear Team Management Tools
  [getToolName("linear_get_teams")]: {
    name: getToolName("linear_get_teams"),
    description: getToolDescription(
      "Get all teams with their states and labels"
    ),
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  [getToolName("linear_get_user")]: {
    name: getToolName("linear_get_user"),
    description: getToolDescription("Get current user information"),
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  [getToolName("linear_delete_issue")]: {
    name: getToolName("linear_delete_issue"),
    description: getToolDescription("Delete an issue"),
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Issue UUID (not issue identifier like 'ENG-123')",
        },
      },
      required: ["id"],
    },
  },

  [getToolName("linear_get_project")]: {
    name: getToolName("linear_get_project"),
    description: getToolDescription("Get project information"),
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Project identifier",
        },
      },
      required: ["id"],
    },
  },

  [getToolName("linear_list_projects")]: {
    name: getToolName("linear_list_projects"),
    description: getToolDescription(
      "List all projects or filter them by criteria"
    ),
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "object",
          properties: {
            status: {
              type: "object",
              properties: {
                eq: { type: "string", description: "Equal to" },
                in: {
                  type: "array",
                  items: { type: "string" },
                  description: "In array of values",
                },
                neq: { type: "string", description: "Not equal to" },
                nin: {
                  type: "array",
                  items: { type: "string" },
                  description: "Not in array of values",
                },
              },
              description: "Filter by project status",
            },
            projectMilestones: {
              type: "object",
              description: "Filter by project milestones",
            },
            projectUpdates: {
              type: "object",
              description: "Filter by project updates",
            },
            nextProjectMilestone: {
              type: "object",
              description: "Filter by next project milestone",
            },
            completedProjectMilestones: {
              type: "object",
              description: "Filter by completed project milestones",
            },
          },
          description: "Optional filter criteria for projects",
        },
      },
    },
  },

  [getToolName("linear_create_issues")]: {
    name: getToolName("linear_create_issues"),
    description: getToolDescription("Create multiple issues at once"),
    inputSchema: {
      type: "object",
      properties: {
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Issue title",
              },
              description: {
                type: "string",
                description: "Issue description",
              },
              teamId: {
                type: "string",
                description: "Team ID (UUID)",
              },
              parentId: {
                type: "string",
                description: "Parent issue ID (UUID, not issue identifier)",
                optional: true,
              },
              labelIds: {
                type: "array",
                items: {
                  type: "string",
                },
                description:
                  "Label UUIDs to apply, eg ['a1eb5aed-7425-4ea5-98ec-dfab52381e0e']",
                optional: true,
              },
              assigneeId: {
                type: "string",
                description: "Assignee user ID (UUID)",
                optional: true,
              },
              priority: {
                type: "number",
                description: "Issue priority (0-4)",
                optional: true,
              },
              projectId: {
                type: "string",
                description: "Project ID",
                optional: true,
              },
              createAsUser: {
                type: "string",
                description: "Name to display for the created issue",
                optional: true,
              },
              displayIconUrl: {
                type: "string",
                description: "URL of the avatar to display",
                optional: true,
              },
            },
            required: ["title", "description", "teamId"],
          },
          description: "List of issues to create",
        },
      },
      required: ["issues"],
    },
  },

  // Linear Comment Management Tools
  [getToolName("linear_create_comment")]: {
    name: getToolName("linear_create_comment"),
    description: getToolDescription("Creates a new comment on an issue"),
    inputSchema: {
      type: "object",
      properties: {
        body: {
          type: "string",
          description: "Comment text content",
        },
        issueId: {
          type: "string",
          description: "ID of the issue to comment on",
        },
      },
      required: ["body", "issueId"],
    },
  },

  [getToolName("linear_update_comment")]: {
    name: getToolName("linear_update_comment"),
    description: getToolDescription("Updates an existing comment"),
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Comment ID",
        },
        input: {
          type: "object",
          properties: {
            body: {
              type: "string",
              description: "Updated comment text",
            },
          },
          required: ["body"],
        },
      },
      required: ["id", "input"],
    },
  },

  [getToolName("linear_delete_comment")]: {
    name: getToolName("linear_delete_comment"),
    description: getToolDescription("Deletes a comment"),
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Comment ID to delete",
        },
      },
      required: ["id"],
    },
  },

  [getToolName("linear_resolve_comment")]: {
    name: getToolName("linear_resolve_comment"),
    description: getToolDescription("Resolves a comment"),
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Comment ID to resolve",
        },
        resolvingCommentId: {
          type: "string",
          description: "Optional ID of a resolving comment",
          optional: true,
        },
      },
      required: ["id"],
    },
  },

  [getToolName("linear_unresolve_comment")]: {
    name: getToolName("linear_unresolve_comment"),
    description: getToolDescription("Unresolves a comment"),
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Comment ID to unresolve",
        },
      },
      required: ["id"],
    },
  },

  // Linear Customer Need Tools
  [getToolName("linear_create_customer_need_from_attachment")]: {
    name: getToolName("linear_create_customer_need_from_attachment"),
    description: getToolDescription(
      "Creates a new customer need from an attachment"
    ),
    inputSchema: {
      type: "object",
      properties: {
        attachmentId: {
          type: "string",
          description: "ID of the attachment",
        },
        title: {
          type: "string",
          description: "Title for the customer need",
          optional: true,
        },
        description: {
          type: "string",
          description: "Description for the customer need",
          optional: true,
        },
        teamId: {
          type: "string",
          description: "Team ID for the customer need",
          optional: true,
        },
      },
      required: ["attachmentId"],
    },
  },
  // Linear Project Milestone Tools
  [getToolName("linear_get_project_milestones")]: {
    name: getToolName("linear_get_project_milestones"),
    description: getToolDescription(
      "Get milestones for a project with filtering and pagination"
    ),
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID to get milestones for",
        },
        filter: {
          type: "object",
          properties: {
            name: {
              type: "object",
              properties: {
                eq: { type: "string", description: "Equal to" },
                contains: { type: "string", description: "Contains string" },
              },
              description: "Filter by milestone name",
            },
            targetDate: {
              type: "object",
              properties: {
                lt: { type: "string", description: "Less than date" },
                gt: { type: "string", description: "Greater than date" },
              },
              description: "Filter by target date",
            },
            completed: {
              type: "boolean",
              description: "Filter by completion status",
            },
          },
          description: "Optional filter criteria",
          optional: true,
        },
        first: {
          type: "number",
          description: "Number of items to return (used with after)",
          optional: true,
        },
        after: {
          type: "string",
          description: "Cursor for forward pagination",
          optional: true,
        },
        last: {
          type: "number",
          description: "Number of items to return (used with before)",
          optional: true,
        },
        before: {
          type: "string",
          description: "Cursor for backward pagination",
          optional: true,
        },
        includeArchived: {
          type: "boolean",
          description: "Include archived milestones",
          optional: true,
        },
        orderBy: {
          type: "string",
          description: "Field to order by (createdAt or updatedAt)",
          optional: true,
        },
      },
      required: ["projectId"],
    },
  },

  [getToolName("linear_create_project_milestone")]: {
    name: getToolName("linear_create_project_milestone"),
    description: getToolDescription("Create a new project milestone"),
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID to create milestone for",
        },
        name: {
          type: "string",
          description: "Milestone name",
        },
        description: {
          type: "string",
          description: "Milestone description",
          optional: true,
        },
        targetDate: {
          type: "string",
          description: "Target completion date (ISO format)",
          optional: true,
        },
        sortOrder: {
          type: "number",
          description: "Sort order for the milestone",
          optional: true,
        },
      },
      required: ["projectId", "name"],
    },
  },

  [getToolName("linear_update_project_milestone")]: {
    name: getToolName("linear_update_project_milestone"),
    description: getToolDescription("Update a project milestone"),
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Milestone ID to update",
        },
        name: {
          type: "string",
          description: "New milestone name",
          optional: true,
        },
        description: {
          type: "string",
          description: "New milestone description",
          optional: true,
        },
        targetDate: {
          type: "string",
          description: "New target completion date (ISO format)",
          optional: true,
        },
        sortOrder: {
          type: "number",
          description: "New sort order",
          optional: true,
        },
      },
      required: ["id"],
    },
  },

  [getToolName("linear_delete_project_milestone")]: {
    name: getToolName("linear_delete_project_milestone"),
    description: getToolDescription("Delete a project milestone"),
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Milestone ID to delete",
        },
      },
      required: ["id"],
    },
  },

  [getToolName("linear_get_document")]: {
    name: getToolName("linear_get_document"),
    description: getToolDescription(
      "Get a Linear document (project/initiative doc) by id, including its full markdown content"
    ),
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Document ID (UUID)",
        },
      },
      required: ["id"],
    },
  },

  [getToolName("linear_list_documents")]: {
    name: getToolName("linear_list_documents"),
    description: getToolDescription(
      "List documents in the Linear workspace. Returns metadata only (no content). Use linear_get_document for full content. When `query` is set, runs a free-text search and ignores other filters."
    ),
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max results (default 50, max 250)",
          optional: true,
        },
        cursor: {
          type: "string",
          description: "Next page cursor (from prior pageInfo.endCursor)",
          optional: true,
        },
        orderBy: {
          type: "string",
          enum: ["createdAt", "updatedAt"],
          description: "Sort field (default updatedAt)",
          optional: true,
        },
        includeArchived: {
          type: "boolean",
          description: "Include archived documents (default false)",
          optional: true,
        },
        projectId: {
          type: "string",
          description: "Filter by parent project ID (UUID)",
          optional: true,
        },
        initiativeId: {
          type: "string",
          description: "Filter by parent initiative ID (UUID)",
          optional: true,
        },
        creatorId: {
          type: "string",
          description: "Filter by creator user ID (UUID)",
          optional: true,
        },
        createdAt: {
          type: "string",
          description:
            "Created after: ISO-8601 timestamp (e.g. 2026-01-01T00:00:00Z)",
          optional: true,
        },
        updatedAt: {
          type: "string",
          description: "Updated after: ISO-8601 timestamp",
          optional: true,
        },
        query: {
          type: "string",
          description:
            "Free-text search across document title and body. When set, takes precedence over other filters.",
          optional: true,
        },
      },
    },
  },

  [getToolName("linear_save_document")]: {
    name: getToolName("linear_save_document"),
    description: getToolDescription(
      "Create or update a Linear document. Update if `id` is supplied, otherwise create. When creating, `title` is required and exactly one parent (projectId, initiativeId, issueId, or cycleId) must be supplied. Content is Markdown — pass literal newlines, not escape sequences."
    ),
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Document ID to update. Omit to create a new document.",
          optional: true,
        },
        title: {
          type: "string",
          description: "Document title (required when creating)",
          optional: true,
        },
        content: {
          type: "string",
          description:
            "Document body as Markdown. Use real newlines, not \\n. Mention users with @displayName.",
          optional: true,
        },
        color: {
          type: "string",
          description: "Hex color (e.g. #4F46E5)",
          optional: true,
        },
        projectId: {
          type: "string",
          description: "Parent project ID (UUID)",
          optional: true,
        },
        initiativeId: {
          type: "string",
          description: "Parent initiative ID (UUID)",
          optional: true,
        },
        issueId: {
          type: "string",
          description: "Parent issue ID (UUID)",
          optional: true,
        },
        cycleId: {
          type: "string",
          description: "Parent cycle ID (UUID)",
          optional: true,
        },
      },
    },
  },
};
