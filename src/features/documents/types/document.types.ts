/**
 * Document operation types for Linear documents (project/initiative docs).
 */

export interface DocumentRef {
  id: string;
  name: string;
}

export interface UserRef {
  id: string;
  name: string;
  email?: string;
}

export interface Document {
  id: string;
  title: string;
  icon?: string | null;
  content?: string | null;
  url: string;
  updatedAt: string;
  creator?: UserRef | null;
  project?: DocumentRef | null;
  initiative?: DocumentRef | null;
}

export interface GetDocumentResponse {
  document: Document;
}

export interface DocumentListNode {
  id: string;
  title: string;
  icon?: string | null;
  url: string;
  updatedAt: string;
  creator?: UserRef | null;
  project?: DocumentRef | null;
  initiative?: DocumentRef | null;
}

export interface ListDocumentsResponse {
  documents: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    nodes: DocumentListNode[];
  };
}

export interface DocumentFilter {
  [key: string]: unknown;
}

export interface ListDocumentsArgs {
  limit?: number;
  cursor?: string;
  orderBy?: "createdAt" | "updatedAt";
  includeArchived?: boolean;
  projectId?: string;
  initiativeId?: string;
  creatorId?: string;
  query?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveDocumentArgs {
  id?: string;
  title?: string;
  content?: string;
  icon?: string;
  color?: string;
  projectId?: string;
  initiativeId?: string;
  issueId?: string;
  cycleId?: string;
}

export interface SaveDocumentResponse {
  document: Document;
}

export interface DocumentMutationResponse {
  documentCreate?: { success: boolean; document: Document };
  documentUpdate?: { success: boolean; document: Document };
}
