export type JobType = "single" | "bulk";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type QrFormat = "png" | "svg";

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface QrCustomization {
  size: number;
  foregroundColor: string;
  backgroundColor: string;
  margin: number;
  format: QrFormat;
  errorCorrectionLevel: ErrorCorrectionLevel;
  filenamePrefix?: string;
}

export interface SingleQrRequest extends QrCustomization {
  content: string;
}

export interface BulkQrRequest extends QrCustomization {
  fileFieldName: "file";
  requiredCsvColumns: ["content"];
}

export interface AuthPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface JobArtifact {
  fileName: string;
  downloadUrl: string;
}

export interface JobSummary {
  id: string;
  type: JobType;
  status: JobStatus;
  totalCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface JobDetail extends JobSummary {
  errorMessage?: string | null;
  artifact?: JobArtifact;
}

export interface AnalyticsSummary {
  totalJobs: number;
  singleJobs: number;
  bulkJobs: number;
  totalQrsGenerated: number;
  completedJobs: number;
  failedJobs: number;
}
