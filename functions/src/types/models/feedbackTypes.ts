export interface SystemRequest {
  type: "feedback" | "bug";
  message: string;
  userId?: string;
}
