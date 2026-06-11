import { gql } from "graphql-tag";

export const CREATE_ISSUE_MUTATION = gql`
  mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        url
      }
    }
  }
`;

export const CREATE_ISSUES_MUTATION = gql`
  mutation CreateIssues($input: [IssueCreateInput!]!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        url
      }
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: ProjectCreateInput!) {
    projectCreate(input: $input) {
      success
      project {
        id
        name
        url
      }
      lastSyncId
    }
  }
`;

export const CREATE_BATCH_ISSUES = gql`
  mutation CreateBatchIssues($input: IssueBatchCreateInput!) {
    issueBatchCreate(input: $input) {
      success
      issues {
        id
        identifier
        title
        url
      }
      lastSyncId
    }
  }
`;

export const UPDATE_ISSUE_MUTATION = gql`
  mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        id
        identifier
        title
        description
        url
        state {
          id
          name
          type
          color
        }
        priority
        estimate
        dueDate
        sortOrder
        assignee {
          id
          name
        }
        labels {
          nodes {
            id
            name
            color
          }
        }
        project {
          id
          name
        }
        projectMilestone {
          id
          name
        }
        parent {
          id
          identifier
          title
        }
        updatedAt
      }
    }
  }
`;

export const CREATE_ISSUE_RELATION_MUTATION = gql`
  mutation CreateIssueRelation($input: IssueRelationCreateInput!) {
    issueRelationCreate(input: $input) {
      success
      issueRelation {
        id
        type
        issue {
          identifier
          title
        }
        relatedIssue {
          identifier
          title
        }
      }
    }
  }
`;

export const DELETE_ISSUE_MUTATION = gql`
  mutation DeleteIssue($id: String!) {
    issueDelete(id: $id) {
      success
    }
  }
`;

export const CREATE_ISSUE_LABELS = gql`
  mutation CreateIssueLabels($labels: [IssueLabelCreateInput!]!) {
    issueLabelCreate(input: $labels) {
      success
      issueLabels {
        id
        name
        color
      }
    }
  }
`;

export const CREATE_PROJECT_MILESTONE = gql`
  mutation CreateProjectMilestone($input: ProjectMilestoneCreateInput!) {
    projectMilestoneCreate(input: $input) {
      success
      projectMilestone {
        id
        name
        description
        targetDate
        progress
        sortOrder
        archivedAt
        createdAt
        updatedAt
        currentProgress
        progressHistory
        descriptionState
        documentContent {
          content
        }
        project {
          id
          name
        }
        issues {
          nodes {
            id
            identifier
            title
          }
        }
      }
    }
  }
`;

export const UPDATE_PROJECT_MILESTONE = gql`
  mutation UpdateProjectMilestone(
    $id: String!
    $input: ProjectMilestoneUpdateInput!
  ) {
    projectMilestoneUpdate(id: $id, input: $input) {
      success
      projectMilestone {
        id
        name
        description
        targetDate
        progress
        sortOrder
        archivedAt
        createdAt
        updatedAt
        currentProgress
        progressHistory
        descriptionState
        documentContent {
          content
        }
        project {
          id
          name
        }
        issues {
          nodes {
            id
            identifier
            title
          }
        }
      }
    }
  }
`;

export const DELETE_PROJECT_MILESTONE = gql`
  mutation DeleteProjectMilestone($id: String!) {
    projectMilestoneDelete(id: $id) {
      success
    }
  }
`;

export const CREATE_DOCUMENT_MUTATION = gql`
  mutation CreateDocument($input: DocumentCreateInput!) {
    documentCreate(input: $input) {
      success
      document {
        id
        title
        icon
        url
        content
        updatedAt
        project {
          id
          name
        }
        initiative {
          id
          name
        }
      }
    }
  }
`;

export const UPDATE_DOCUMENT_MUTATION = gql`
  mutation UpdateDocument($id: String!, $input: DocumentUpdateInput!) {
    documentUpdate(id: $id, input: $input) {
      success
      document {
        id
        title
        icon
        url
        content
        updatedAt
        project {
          id
          name
        }
        initiative {
          id
          name
        }
      }
    }
  }
`;

