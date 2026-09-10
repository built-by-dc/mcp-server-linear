import { BaseHandler } from "../../../core/handlers/base.handler.js";
import { BaseToolResponse } from "../../../core/interfaces/tool-handler.interface.js";
import { LinearAuth } from "../../../auth.js";
import { LinearGraphQLClient } from "../../../graphql/client.js";
import { ProjectUpdateFields } from "../types/project.types.js";

/**
 * Handler for project-related operations.
 * Manages creating, searching, and retrieving project information.
 */
export class ProjectHandler extends BaseHandler {
  constructor(auth: LinearAuth, graphqlClient?: LinearGraphQLClient) {
    super(auth, graphqlClient);
  }

  /**
   * Creates a new project with associated issues.
   */
  /**
   * Creates a new project with associated issues
   * @example
   * ```typescript
   * const result = await handler.handleCreateProjectWithIssues({
   *   project: {
   *     name: "Q1 Planning",
   *     description: "Q1 2025 Planning Project",
   *     teamIds: ["team-id-1"], // Required: Array of team IDs
   *   },
   *   issues: [{
   *     title: "Project Setup",
   *     description: "Initial project setup tasks",
   *     teamId: "team-id-1"
   *   }]
   * });
   * ```
   */
  async handleCreateProjectWithIssues(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["project", "issues"]);

      // Validate project input
      if (
        !args.project.teamIds ||
        !Array.isArray(args.project.teamIds) ||
        args.project.teamIds.length === 0
      ) {
        throw new Error(
          "Project requires teamIds as an array with at least one team ID.\n" +
            "Example:\n" +
            "{\n" +
            "  project: {\n" +
            '    name: "Project Name",\n' +
            '    teamIds: ["team-id-1"]\n' +
            "  },\n" +
            '  issues: [{ title: "Issue Title", teamId: "team-id-1" }]\n' +
            "}"
        );
      }

      if (!Array.isArray(args.issues)) {
        throw new Error(
          "Issues parameter must be an array of issue objects.\n" +
            'Example: issues: [{ title: "Issue Title", teamId: "team-id-1" }]'
        );
      }

      // Validate each issue has required teamId
      args.issues.forEach((issue: any, index: number) => {
        if (!issue.teamId) {
          throw new Error(
            `Issue at index ${index} is missing required teamId.\n` +
              "Each issue must have a teamId that matches one of the project teamIds."
          );
        }
      });

      // Refuse a name that already exists unless explicitly overridden. Retrying
      // a failed create is the main way duplicate projects appear, and a caller
      // who has just seen an error cannot tell whether the first attempt landed.
      if (!args.allowDuplicateName) {
        const clashes = await client.findProjectsByName(args.project.name);
        if (clashes.length > 0) {
          throw new Error(
            `A project named "${args.project.name}" already exists: ` +
              clashes.map((c) => `${c.id} (${c.url})`).join(", ") +
              ". Reuse it, choose a different name, or pass allowDuplicateName: true " +
              "if a second project with this name is genuinely intended."
          );
        }
      }

      const result = await client.createProjectWithIssues(
        args.project,
        args.issues
      );

      if (
        !result.projectCreate.success ||
        (result.issueBatchCreate && !result.issueBatchCreate.success)
      ) {
        throw new Error("Failed to create project or issues");
      }

      const { project } = result.projectCreate;
      const issuesCreated = result.issueBatchCreate?.issues.length ?? 0;

      const response = [
        `Successfully created project with issues`,
        `Project: ${project.name}`,
        // The id is reported so the caller can chain straight into
        // linear_update_project without a lookup by name (TEH-4370 defect 2).
        `Project ID: ${project.id}`,
        `Project URL: ${project.url}`,
      ];

      if (issuesCreated > 0) {
        response.push(`Issues created: ${issuesCreated}`);
        // Add details for each issue
        result.issueBatchCreate?.issues.forEach((issue) => {
          response.push(`- ${issue.identifier}: ${issue.title} (${issue.url})`);
        });
      }

      return this.createResponse(response.join("\n"));
    } catch (error) {
      this.handleError(error, "create project with issues");
    }
  }

  /**
   * Gets information about a specific project.
   */
  async handleGetProject(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["id"]);

      const result = await client.getProject(args.id);

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "get project info");
    }
  }

  /**
   * Lists all projects or searches with optional filters.
   */
  async handleListProjects(args: any = {}): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      const result = await client.searchProjects(args.filter);
      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "list projects");
    }
  }

  /**
   * Get project milestones with filtering and pagination
   */
  async handleGetProjectMilestones(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["projectId"]);

      const result = await client.getProjectMilestones(
        args.projectId,
        args.filter,
        args.first,
        args.after,
        args.last,
        args.before,
        args.includeArchived,
        args.orderBy
      );

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "get project milestones");
    }
  }

  /**
   * Create a new project milestone
   */
  async handleCreateProjectMilestone(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["projectId", "name"]);

      const result = await client.createProjectMilestone({
        projectId: args.projectId,
        name: args.name,
        description: args.description,
        targetDate: args.targetDate,
        sortOrder: args.sortOrder,
      });

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "create project milestone");
    }
  }

  /**
   * Update a project milestone
   */
  async handleUpdateProjectMilestone(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["id"]);

      const result = await client.updateProjectMilestone(args.id, {
        name: args.name,
        description: args.description,
        targetDate: args.targetDate,
        sortOrder: args.sortOrder,
      });

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "update project milestone");
    }
  }

  /**
   * Delete a project milestone
   */
  /**
   * Updates a project's own fields (name, description, status, lead, dates).
   */
  async handleUpdateProject(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["id"]);

      const input: ProjectUpdateFields = {
        name: args.name,
        description: args.description,
        content: args.content,
        statusId: args.statusId,
        leadId: args.leadId,
        memberIds: args.memberIds,
        teamIds: args.teamIds,
        labelIds: args.labelIds,
        startDate: args.startDate,
        targetDate: args.targetDate,
        priority: args.priority,
        icon: args.icon,
        color: args.color,
        sortOrder: args.sortOrder,
      };

      // Drop undefined keys so an omitted field is left untouched rather than nulled.
      const cleaned = Object.fromEntries(
        Object.entries(input).filter(([, v]) => v !== undefined)
      ) as ProjectUpdateFields;

      if (Object.keys(cleaned).length === 0) {
        throw new Error(
          "update project requires at least one field to change besides id"
        );
      }

      const result = await client.updateProject(args.id, cleaned);

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "update project");
    }
  }

  /**
   * Moves a project to the trash. Reversible via handleRestoreProject.
   */
  async handleDeleteProject(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["id"]);

      const result = await client.deleteProject(args.id);

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "delete project");
    }
  }

  /**
   * Restores a trashed or archived project.
   */
  async handleRestoreProject(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["id"]);

      const result = await client.restoreProject(args.id);

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "restore project");
    }
  }

  async handleDeleteProjectMilestone(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["id"]);

      const result = await client.deleteProjectMilestone(args.id);

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "delete project milestone");
    }
  }
}
