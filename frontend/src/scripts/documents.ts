/**
 * Document Management Script
 * Handles document upload, list, download, and delete functionality
 */

import {
  uploadDocument,
  listDocuments,
  downloadDocument,
  deleteDocument,
  formatFileSize,
  formatDate,
} from '../services/documentApi';
import type { Document, UploadProgress } from '../types/document';

// DOM Elements
let uploadArea: HTMLElement;
let fileInput: HTMLInputElement;
let browseBtnuploadBtn: HTMLButtonElement;
let uploadPlaceholder: HTMLElement;
let uploadProgressList: HTMLElement;
let uploadStatus: HTMLElement;
let documentsLoading: HTMLElement;
let documentsEmpty: HTMLElement;
let documentsError: HTMLElement;
let documentsGrid: HTMLElement;
let documentsCount: HTMLElement;
let retryBtn: HTMLButtonElement;

// State
let documents: Document[] = [];

/**
 * Initialize the document management functionality
 */
export function initializeDocumentManagement() {
  console.log('[DocumentManagement] Initializing...');
  
  // Get DOM elements
  uploadArea = document.getElementById('uploadArea') as HTMLElement;
  fileInput = document.getElementById('fileInput') as HTMLInputElement;
  browseBtnuploadBtn = document.getElementById('browseBtnuploadBtn') as HTMLButtonElement;
  uploadPlaceholder = document.getElementById('uploadPlaceholder') as HTMLElement;
  uploadProgressList = document.getElementById('uploadProgressList') as HTMLElement;
  uploadStatus = document.getElementById('uploadStatus') as HTMLElement;
  documentsLoading = document.getElementById('documentsLoading') as HTMLElement;
  documentsEmpty = document.getElementById('documentsEmpty') as HTMLElement;
  documentsError = document.getElementById('documentsError') as HTMLElement;
  documentsGrid = document.getElementById('documentsGrid') as HTMLElement;
  documentsCount = document.getElementById('documentsCount') as HTMLElement;
  retryBtn = document.getElementById('retryBtn') as HTMLButtonElement;
  
  if (!uploadArea || !fileInput) {
    console.error('[DocumentManagement] Required elements not found');
    return;
  }
  
  // Set up event listeners
  setupUploadListeners();
  setupDocumentListeners();
  
  // Load documents
  loadDocuments();
  
  console.log('[DocumentManagement] Initialized');
}

/**
 * Set up upload-related event listeners
 */
function setupUploadListeners() {
  // Browse button click
  browseBtnuploadBtn?.addEventListener('click', () => {
    fileInput.click();
  });
  
  // File input change
  fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      handleFiles(Array.from(target.files));
      target.value = ''; // Reset input
    }
  });
  
  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
  });
}

/**
 * Set up document list event listeners
 */
function setupDocumentListeners() {
  // Retry button
  retryBtn?.addEventListener('click', () => {
    loadDocuments();
  });
  
  // Event delegation for document actions
  documentsGrid?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('button');
    
    if (!button) return;
    
    // Download button
    if (button.classList.contains('download-btn')) {
      const filename = button.dataset.filename;
      const originalName = button.dataset.originalName;
      if (filename && originalName) {
        await handleDownload(filename, originalName);
      }
    }
    
    // Delete button
    if (button.classList.contains('delete-btn')) {
      const filename = button.dataset.filename;
      if (filename && confirm('Are you sure you want to delete this document?')) {
        await handleDelete(filename);
      }
    }
  });
}

/**
 * Handle file uploads
 */
async function handleFiles(files: File[]) {
  console.log('[DocumentManagement] Uploading', files.length, 'files');
  
  // Hide placeholder, show progress list
  uploadPlaceholder.style.display = 'none';
  uploadProgressList.style.display = 'block';
  uploadProgressList.innerHTML = '';
  
  // Upload each file
  for (const file of files) {
    await uploadFile(file);
  }
  
  // Reload documents after all uploads
  await loadDocuments();
  
  // Reset UI after a delay
  setTimeout(() => {
    uploadPlaceholder.style.display = 'block';
    uploadProgressList.style.display = 'none';
    uploadProgressList.innerHTML = '';
  }, 3000);
}

/**
 * Upload a single file
 */
async function uploadFile(file: File) {
  // Create progress item
  const progressItem = createProgressItem(file.name);
  uploadProgressList.appendChild(progressItem);
  
  const progressBar = progressItem.querySelector('.upload-progress-fill') as HTMLElement;
  const progressText = progressItem.querySelector('.upload-percentage') as HTMLElement;
  const statusText = progressItem.querySelector('.upload-status-text') as HTMLElement;
  
  try {
    // Upload with progress tracking
    await uploadDocument(file, (progress: UploadProgress) => {
      progressBar.style.width = `${progress.percentage}%`;
      progressText.textContent = `${progress.percentage}%`;
    });
    
    // Success
    progressBar.style.width = '100%';
    progressText.textContent = '100%';
    statusText.textContent = 'Upload complete! Processing embeddings...';
    statusText.classList.add('success');
    
    showUploadStatus(`Successfully uploaded ${file.name}`, false);
    
  } catch (error) {
    // Error
    statusText.textContent = `Error: ${error instanceof Error ? error.message : 'Upload failed'}`;
    statusText.classList.add('error');
    
    showUploadStatus(`Failed to upload ${file.name}`, true);
    console.error('[DocumentManagement] Upload error:', error);
  }
}

/**
 * Create progress item element
 */
function createProgressItem(fileName: string): HTMLElement {
  const item = document.createElement('div');
  item.className = 'upload-progress-item';
  item.innerHTML = `
    <div class="upload-progress-header">
      <span class="upload-file-name">${fileName}</span>
      <span class="upload-percentage">0%</span>
    </div>
    <div class="upload-progress-bar">
      <div class="upload-progress-fill" style="width: 0%"></div>
    </div>
    <div class="upload-status-text">Uploading...</div>
  `;
  return item;
}

/**
 * Show upload status message
 */
function showUploadStatus(message: string, isError: boolean) {
  uploadStatus.style.display = 'flex';
  uploadStatus.classList.toggle('error', isError);
  
  const statusMessage = uploadStatus.querySelector('.status-message') as HTMLElement;
  const statusIcon = uploadStatus.querySelector('.status-icon i') as HTMLElement;
  
  statusMessage.textContent = message;
  statusIcon.className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    uploadStatus.style.display = 'none';
  }, 5000);
}

/**
 * Load and display documents
 */
async function loadDocuments() {
  console.log('[DocumentManagement] Loading documents...');
  
  // Show loading state
  documentsLoading.style.display = 'block';
  documentsEmpty.style.display = 'none';
  documentsError.style.display = 'none';
  documentsGrid.style.display = 'none';
  
  try {
    documents = await listDocuments();
    console.log('[DocumentManagement] Loaded', documents.length, 'documents');
    
    // Update count
    updateDocumentCount(documents.length);
    
    // Show appropriate state
    documentsLoading.style.display = 'none';
    
    if (documents.length === 0) {
      documentsEmpty.style.display = 'block';
    } else {
      documentsGrid.style.display = 'grid';
      renderDocuments(documents);
    }
    
  } catch (error) {
    console.error('[DocumentManagement] Error loading documents:', error);
    
    documentsLoading.style.display = 'none';
    documentsError.style.display = 'block';
    
    const errorDesc = documentsError.querySelector('.error-description') as HTMLElement;
    errorDesc.textContent = error instanceof Error ? error.message : 'Unknown error';
  }
}

/**
 * Render documents in the grid
 */
function renderDocuments(docs: Document[]) {
  documentsGrid.innerHTML = docs.map(doc => createDocumentCard(doc)).join('');
  
  // Update metadata (file size and date)
  docs.forEach(doc => {
    const card = documentsGrid.querySelector(`[data-document-id="${doc.id}"]`);
    if (card) {
      const sizeEl = card.querySelector('.document-size') as HTMLElement;
      const dateEl = card.querySelector('.document-date') as HTMLElement;
      
      if (sizeEl) sizeEl.textContent = formatFileSize(doc.size);
      if (dateEl) dateEl.textContent = formatDate(doc.uploadedAt);
    }
  });
}

/**
 * Create document card HTML
 */
function createDocumentCard(doc: Document): string {
  const fileExtension = doc.originalName.split('.').pop()?.toUpperCase() || 'FILE';
  const fileIcon = getFileIcon(doc.mimeType);
  
  return `
    <div class="document-card" data-document-id="${doc.id}">
      <div class="document-icon">
        <i class="fas ${fileIcon}"></i>
        <span class="file-type">${fileExtension}</span>
      </div>
      
      <div class="document-info">
        <h3 class="document-name" title="${doc.originalName}">
          ${doc.originalName}
        </h3>
        <div class="document-meta">
          <span class="document-size">${formatFileSize(doc.size)}</span>
          <span class="document-separator">•</span>
          <span class="document-date">${formatDate(doc.uploadedAt)}</span>
        </div>
      </div>
      
      <div class="document-actions">
        <button 
          class="action-btn download-btn" 
          data-filename="${doc.filename}"
          data-original-name="${doc.originalName}"
          title="Download document"
          aria-label="Download document"
        >
          <i class="fas fa-download"></i>
        </button>
        <button 
          class="action-btn delete-btn" 
          data-filename="${doc.filename}"
          title="Delete document"
          aria-label="Delete document"
        >
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

/**
 * Get file icon based on mime type
 */
function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'fa-file-pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word';
  if (mimeType.includes('text')) return 'fa-file-alt';
  if (mimeType.includes('markdown')) return 'fa-file-code';
  return 'fa-file';
}

/**
 * Update document count display
 */
function updateDocumentCount(count: number) {
  const countNumber = documentsCount.querySelector('.count-number') as HTMLElement;
  const countLabel = documentsCount.querySelector('.count-label') as HTMLElement;
  
  if (countNumber) countNumber.textContent = count.toString();
  if (countLabel) countLabel.textContent = count === 1 ? 'document' : 'documents';
}

/**
 * Handle document download
 */
async function handleDownload(filename: string, originalName: string) {
  try {
    console.log('[DocumentManagement] Downloading:', originalName);
    await downloadDocument(filename, originalName);
  } catch (error) {
    console.error('[DocumentManagement] Download error:', error);
    alert('Failed to download document. Please try again.');
  }
}

/**
 * Handle document delete
 */
async function handleDelete(filename: string) {
  try {
    console.log('[DocumentManagement] Deleting:', filename);
    await deleteDocument(filename);
    
    // Reload documents
    await loadDocuments();
    
    showUploadStatus('Document deleted successfully', false);
  } catch (error) {
    console.error('[DocumentManagement] Delete error:', error);
    alert('Failed to delete document. Please try again.');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDocumentManagement);
} else {
  initializeDocumentManagement();
}
