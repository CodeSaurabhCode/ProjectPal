/**
 * Document types for PM Handbook functionality
 */

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  url: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  document: Document;
  processing?: {
    chunks: number;
    embeddings: number;
    processingTime: number;
  };
}

export interface DocumentListResponse {
  success: boolean;
  documents: Document[];
  count: number;
}

export interface DocumentDeleteResponse {
  success: boolean;
  message: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface DocumentError {
  error: string;
  details?: string;
}
