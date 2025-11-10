export interface SystemRequest {
  type: "feedback" | "bug";
  message: string;
  user_id?: string;
}
