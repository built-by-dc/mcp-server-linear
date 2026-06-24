import { gql } from "graphql-tag";

export const SEARCH_ISSUES_QUERY = gql`
  query SearchIssues(
    $filter: IssueFilter
    $first: Int
    $after: String
    $orderBy: PaginationOrderBy
  ) {
    issues(filter: $filter, first: $first, after: $after, orderBy: $orderBy) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
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
        assignee {
          id
          name
          email
        }
        team {
          id
          name
          key
        }
        project {
          id
          name
        }
        priority
        parent {
          id
          identifier
        }
        labels {
          nodes {
            id
            name
            color
          }
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_ISSUES_BY_IDENTIFIER = gql`
  query GetIssuesByIdentifier($numbers: [Float!]!) {
    issues(
      filter: { number: { in: $numbers } }
      first: 100
      orderBy: updatedAt
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
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
        assignee {
          id
          name
          email
        }
        team {
          id
          name
          key
        }
        project {
          id
          name
        }
        priority
        parent {
          id
          identifier
        }
        labels {
          nodes {
            id
            name
            color
          }
        }
        parent {
          id
          identifier
          title
        }
        children {
          nodes {
            id
            identifier
            title
            state {
              name
            }
          }
        }
        createdAt
        updatedAt
      }
    }
  }
`;

// Dedicated single-issue read. Returns the full body + structure, but only the
// most recent N comments. Linear orders comments newest-first, so `first: N`
// yields the latest N and hasNextPage signals older comments exist. Use
// GET_ISSUE_COMMENTS_QUERY to page the rest.
export const LIST_NOTIFICATIONS_QUERY = gql`
  query ListNotifications($filter: NotificationFilter, $first: Int) {
    notifications(filter: $filter, first: $first) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        type
        createdAt
        readAt
        title
        inboxUrl
        actor {
          id
          name
        }
        ... on IssueNotification {
          issue {
            id
            identifier
            title
            url
            state {
              name
            }
          }
        }
      }
    }
  }
`;

export const LIST_CYCLES_QUERY = gql`
  query ListCycles($filter: CycleFilter, $first: Int) {
    cycles(filter: $filter, first: $first) {
      nodes {
        id
        number
        name
        startsAt
        endsAt
        completedAt
        isActive
        isNext
        isPrevious
        isPast
        isFuture
        progress
        team {
          id
          key
          name
        }
      }
    }
  }
`;

export const GET_ISSUE_QUERY = gql`
  query GetIssue($id: String!, $commentLimit: Int) {
    issue(id: $id) {
      id
      identifier
      title
      description
      url
      state {
        id
        name
        type
      }
      assignee {
        id
        name
        email
      }
      team {
        id
        name
        key
      }
      project {
        id
        name
      }
      priority
      labels {
        nodes {
          id
          name
        }
      }
      parent {
        id
        identifier
        title
        state {
          name
        }
      }
      children {
        nodes {
          id
          identifier
          title
          state {
            name
          }
        }
      }
      comments(first: $commentLimit) {
        pageInfo {
          hasNextPage
        }
        nodes {
          id
          body
          user {
            id
            name
          }
          createdAt
          resolvedAt
          resolvingComment {
            id
          }
        }
      }
      createdAt
      updatedAt
    }
  }
`;

// Paginated full comment thread for a single issue (newest-first, as Linear
// orders them; walk older with first/after).
export const GET_ISSUE_COMMENTS_QUERY = gql`
  query GetIssueComments($id: String!, $first: Int, $after: String) {
    issue(id: $id) {
      id
      identifier
      comments(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          body
          user {
            id
            name
            email
          }
          createdAt
          updatedAt
          resolvedAt
          resolvingComment {
            id
            body
          }
        }
      }
    }
  }
`;

export const SEARCH_ISSUES_IN_COMMENTS_QUERY = gql`
  query SearchIssuesInComments(
    $term: String!
    $filter: IssueFilter
    $first: Int
    $after: String
    $orderBy: PaginationOrderBy
    $snippetSize: Float
  ) {
    searchIssues(
      term: $term
      filter: $filter
      first: $first
      after: $after
      orderBy: $orderBy
      includeComments: true
      snippetSize: $snippetSize
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        identifier
        title
        url
        state {
          id
          name
          type
        }
        assignee {
          id
          name
        }
        team {
          id
          name
          key
        }
        project {
          id
          name
        }
        priority
        metadata
        createdAt
        updatedAt
      }
    }
  }
`;

export const FULLTEXT_SEARCH_ISSUES_QUERY = gql`
  query FulltextSearchIssues(
    $term: String!
    $filter: IssueFilter
    $first: Int
    $after: String
    $orderBy: PaginationOrderBy
  ) {
    searchIssues(
      term: $term
      filter: $filter
      first: $first
      after: $after
      orderBy: $orderBy
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
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
        assignee {
          id
          name
          email
        }
        team {
          id
          name
          key
        }
        project {
          id
          name
        }
        priority
        parent {
          id
          identifier
        }
        labels {
          nodes {
            id
            name
            color
          }
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_TEAMS_QUERY = gql`
  query GetTeams {
    teams {
      nodes {
        id
        name
        key
        description
        states {
          nodes {
            id
            name
            type
            color
          }
        }
        labels {
          nodes {
            id
            name
            color
          }
        }
      }
    }
  }
`;

export const GET_USER_QUERY = gql`
  query GetUser {
    viewer {
      id
      name
      email
      teams {
        nodes {
          id
          name
          key
        }
      }
    }
  }
`;

export const SEARCH_PROJECTS_QUERY = gql`
  query SearchProjects($filter: ProjectFilter) {
    projects(filter: $filter) {
      nodes {
        id
        name
        description
        url
        state
        teams {
          nodes {
            id
            name
          }
        }
      }
    }
  }
`;

export const GET_PROJECT_QUERY = gql`
  query GetProject($id: String!) {
    project(id: $id) {
      id
      name
      description
      url
      teams {
        nodes {
          id
          name
        }
      }
      projectMilestones {
        nodes {
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
  }
`;

export const GET_DOCUMENT_QUERY = gql`
  query GetDocument($id: String!) {
    document(id: $id) {
      id
      title
      icon
      content
      url
      updatedAt
      creator {
        id
        name
        email
      }
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
`;

export const LIST_DOCUMENTS_QUERY = gql`
  query ListDocuments(
    $first: Int!
    $after: String
    $filter: DocumentFilter
    $orderBy: PaginationOrderBy
    $includeArchived: Boolean
  ) {
    documents(
      first: $first
      after: $after
      filter: $filter
      orderBy: $orderBy
      includeArchived: $includeArchived
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        icon
        url
        createdAt
        updatedAt
        archivedAt
        creator {
          id
          name
          email
        }
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

export const SEARCH_DOCUMENTS_QUERY = gql`
  query SearchDocuments(
    $term: String!
    $first: Int!
    $after: String
    $includeArchived: Boolean
  ) {
    searchDocuments(
      term: $term
      first: $first
      after: $after
      includeArchived: $includeArchived
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        icon
        url
        createdAt
        updatedAt
        archivedAt
        creator {
          id
          name
          email
        }
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

export const LIST_VIEWS_QUERY = gql`
  query ListViews($first: Int) {
    customViews(first: $first) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        name
        slugId
        description
        shared
        organization {
          urlKey
        }
        team {
          id
          key
          name
        }
        creator {
          id
          name
        }
        updatedAt
      }
    }
  }
`;

export const GET_VIEW_ISSUES_QUERY = gql`
  query GetViewIssues($id: String!, $first: Int) {
    customView(id: $id) {
      id
      name
      issues(first: $first) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          identifier
          title
          url
          state {
            id
            name
            type
            color
          }
          assignee {
            id
            name
            email
          }
          team {
            id
            name
            key
          }
          project {
            id
            name
          }
          priority
          parent {
            id
            identifier
          }
          labels {
            nodes {
              id
              name
              color
            }
          }
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const GET_ISSUE_RELATIONS_QUERY = gql`
  query GetIssueRelations($id: String!) {
    issue(id: $id) {
      id
      identifier
      title
      relations {
        nodes {
          id
          type
          relatedIssue {
            id
            identifier
            title
            state {
              name
              type
            }
          }
        }
      }
      inverseRelations {
        nodes {
          id
          type
          issue {
            id
            identifier
            title
            state {
              name
              type
            }
          }
        }
      }
    }
  }
`;

export const GET_ISSUE_HISTORY_QUERY = gql`
  query GetIssueHistory($id: String!, $first: Int) {
    issue(id: $id) {
      id
      identifier
      history(first: $first) {
        nodes {
          id
          createdAt
          actor {
            id
            name
          }
          fromState {
            name
          }
          toState {
            name
          }
          fromAssignee {
            name
          }
          toAssignee {
            name
          }
          fromPriority
          toPriority
          fromTitle
          toTitle
          relationChanges {
            identifier
            type
          }
        }
      }
    }
  }
`;

export const GET_PROJECT_MILESTONES = gql`
  query GetProjectMilestones(
    $filter: ProjectMilestoneFilter
    $first: Int
    $after: String
    $last: Int
    $before: String
    $includeArchived: Boolean
    $orderBy: PaginationOrderBy
  ) {
    projectMilestones(
      filter: $filter
      first: $first
      after: $after
      last: $last
      before: $before
      includeArchived: $includeArchived
      orderBy: $orderBy
    ) {
      nodes {
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
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
