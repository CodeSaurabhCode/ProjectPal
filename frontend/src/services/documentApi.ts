import type {
  Document,
  DocumentUploadResponse,
  DocumentListResponse,
  DocumentDeleteResponse,
  UploadProgress,
} from '../types/document';

const API_BASE_URL = import.meta.env.PUBLIC_BACKEND_URL 
  ? `${import.meta.env.PUBLIC_BACKEND_URL}/api`
  : 'http://localhost:3001/api';

export async function uploadDocument(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append('document', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          });
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid response format'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || error.details || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', `${API_BASE_URL}/documents/upload`);
    xhr.send(formData);
  });
}

export async function listDocuments(): Promise<Document[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }
    
    const data: DocumentListResponse = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to fetch documents');
    }
    
    return data.documents;
  } catch (error) {
    console.error('[DocumentAPI] Error listing documents:', error);
    throw error;
  }
}

export async function downloadDocument(filename: string, originalName: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(filename)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[DocumentAPI] Error downloading document:', error);
    throw error;
  }
}

export async function deleteDocument(filename: string): Promise<void> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/documents/${encodeURIComponent(filename)}`,
      { method: 'DELETE' }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.statusText}`);
    }
    
    const data: DocumentDeleteResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to delete document');
    }
  } catch (error) {
    console.error('[DocumentAPI] Error deleting document:', error);
    throw error;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
