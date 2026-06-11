import { BaseHandler } from "../../../core/handlers/base.handler.js";
import { BaseToolResponse } from "../../../core/interfaces/tool-handler.interface.js";
import { LinearAuth } from "../../../auth.js";
import { LinearGraphQLClient } from "../../../graphql/client.js";
import {
  DocumentFilter,
  ListDocumentsArgs,
  SaveDocumentArgs,
} from "../types/document.types.js";

/**
 * Handler for Linear document operations (project/initiative docs).
 * Tool surface mirrors the official Linear MCP at mcp.linear.app/sse:
 *   - get_document    -> retrieve by id or slug
 *   - list_documents  -> flat filter args; uses searchDocuments when `query` set
 *   - save_document   -> create when no id, update when id supplied
 */
export class DocumentHandler extends BaseHandler {
  constructor(auth: LinearAuth, graphqlClient?: LinearGraphQLClient) {
    super(auth, graphqlClient);
  }

  async handleGetDocument(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ["id"]);
      const result = await client.getDocument(args.id);
      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "get document");
    }
  }

  async handleListDocuments(
    args: ListDocumentsArgs = {}
  ): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();

      const limit = Math.min(args.limit ?? 50, 250);
      const includeArchived = args.includeArchived ?? false;

      // Free-text search path (Linear's searchDocuments doesn't accept filters)
      if (args.query && args.query.trim().length > 0) {
        const result = await client.searchDocuments(
          args.query,
          limit,
          args.cursor,
          includeArchived
        );
        return this.createJsonResponse(result);
      }

      const filter: DocumentFilter = {};
      if (args.projectId) filter.project = { id: { eq: args.projectId } };
      if (args.initiativeId)
        filter.initiative = { id: { eq: args.initiativeId } };
      if (args.creatorId) filter.creator = { id: { eq: args.creatorId } };
      if (args.createdAt) filter.createdAt = { gt: args.createdAt };
      if (args.updatedAt) filter.updatedAt = { gt: args.updatedAt };

      const orderBy = args.orderBy === "createdAt" ? "createdAt" : "updatedAt";

      const result = await client.listDocuments(
        limit,
        args.cursor,
        Object.keys(filter).length ? filter : undefined,
        orderBy,
        includeArchived
      );
      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "list documents");
    }
  }

  async handleSaveDocument(args: SaveDocumentArgs): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();

      const isUpdate = Boolean(args.id);

      const parents = [
        args.projectId,
        args.initiativeId,
        args.issueId,
        args.cycleId,
      ].filter(Boolean);

      if (!isUpdate) {
        if (!args.title) {
          throw new Error("`title` is required when creating a document");
        }
        if (parents.length !== 1) {
          throw new Error(
            "When creating a document, exactly one parent must be supplied (projectId, initiativeId, issueId, or cycleId)"
          );
        }
      } else if (parents.length > 1) {
        throw new Error(
          "At most one parent (projectId, initiativeId, issueId, cycleId) may be supplied per update"
        );
      }

      const input: Record<string, unknown> = {};
      if (args.title !== undefined) input.title = args.title;
      if (args.content !== undefined) input.content = args.content;
      // Linear's `icon` field accepts only named Linear icons (ASCII), not
      // emoji. Passing an emoji throws "icon is not a valid icon" and fails the
      // whole save, so drop any non-ASCII/emoji icon rather than break the write.
      if (args.icon !== undefined && args.icon !== null) {
        const isAsciiIconName = /^[\x20-\x7E]+$/.test(args.icon);
        if (isAsciiIconName) {
          input.icon = args.icon;
        }
      }
      if (args.color !== undefined) input.color = args.color;
      if (args.projectId !== undefined) input.projectId = args.projectId;
      if (args.initiativeId !== undefined)
        input.initiativeId = args.initiativeId;
      if (args.issueId !== undefined) input.issueId = args.issueId;
      if (args.cycleId !== undefined) input.cycleId = args.cycleId;

      const result = isUpdate
        ? await client.updateDocument(args.id as string, input)
        : await client.createDocument(input);

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, "save document");
    }
  }
}
