import type { Comment, Post, PostType } from "./schema";

export type FeedFilters = {
  types: PostType[];
  groupId: string | null;
  onlyMine: boolean;
  query: string;
};

export const emptyFeedFilters: FeedFilters = {
  types: [],
  groupId: null,
  onlyMine: false,
  query: "",
};

export const REPORT_HIDE_THRESHOLD = 3;

export function visiblePosts(
  posts: Post[],
  blockedAuthorIds: string[] = [],
): Post[] {
  return posts.filter(
    (post) =>
      !post.hidden &&
      !post.reported &&
      !blockedAuthorIds.includes(post.authorId),
  );
}

export function filterPosts(
  posts: Post[],
  filters: FeedFilters,
  myAuthorId: string,
): Post[] {
  const query = filters.query.trim().toLowerCase();
  return posts
    .filter((post) => {
      if (filters.groupId && post.groupId !== filters.groupId) return false;
      if (filters.types.length > 0 && !filters.types.includes(post.type))
        return false;
      if (filters.onlyMine && post.authorId !== myAuthorId) return false;
      if (query.length > 0) {
        const haystack = `${post.title} ${post.body}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function commentsForPost(
  comments: Comment[],
  postId: string,
): Comment[] {
  return comments
    .filter((comment) => comment.postId === postId && !comment.reported)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function helpfulComments(comments: Comment[]): Comment[] {
  return comments.filter((comment) => comment.helpful);
}

export function moderationState(post: Post): "publicado" | "em_analise" {
  return post.reported ? "em_analise" : "publicado";
}

export function needsModeration(reportCount: number): boolean {
  return reportCount >= REPORT_HIDE_THRESHOLD;
}

export function isGroupMember(
  memberGroupIds: string[],
  groupId: string,
): boolean {
  return memberGroupIds.includes(groupId);
}
