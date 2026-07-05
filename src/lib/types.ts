// Shared, serializable shapes passed between server and client (dates as ISO strings).

export type CommentDTO = {
  id: string;
  authorName: string;
  body: string;
  xPercent: number | null;
  yPercent: number | null;
  resolved: boolean;
  /** Workflow state: "open" | "in_review" | "resolved" | "wontfix". */
  status: string;
  /** Set when this comment was carried over from an earlier revision. */
  carriedFromId: string | null;
  tags: string[];
  componentRef: string | null;
  partNumber: string | null;
  datasheetUrl: string | null;
  createdAt: string;
  updatedAt: string;
  /** True when the requesting browser owns this comment (matches authorToken). */
  isOwn: boolean;
};

export type ThreadDTO = CommentDTO & {
  replies: CommentDTO[];
};

export type ProjectSummary = {
  id: string;
  title: string;
  createdAt: string;
  fileType: string | null;
  fileUrl: string | null;
  threadCount: number;
  openCount: number;
};
