import {
  uploadDocument,
  listDocuments,
  downloadDocument,
  deleteDocument,
  formatFileSize,
  formatDate,
} from '../services/documentApi';
import type { Document, UploadProgress } from '../types/document';

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

let documents: Document[] = [];

export function initializeDocumentManagement() {
  console.log('[DocumentManagement] Initializing...');

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

  setupUploadListeners();
  setupDocumentListeners();

  loadDocuments();
  
  console.log('[DocumentManagement] Initialized');
}

function setupUploadListeners() {
  browseBtnuploadBtn?.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      handleFiles(Array.from(target.files));
      target.value = '';
    }
  });

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

function setupDocumentListeners() {
  retryBtn?.addEventListener('click', () => {
    loadDocuments();
  });

  documentsGrid?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('button');
    
    if (!button) return;

    if (button.classList.contains('download-btn')) {
      const filename = button.dataset.filename;
      const originalName = button.dataset.originalName;
      if (filename && originalName) {
        await handleDownload(filename, originalName);
      }
    }

    if (button.classList.contains('delete-btn')) {
      const filename = button.dataset.filename;
      if (filename && confirm('Are you sure you want to delete this document?')) {
        await handleDelete(filename);
      }
    }
  });
}

async function handleFiles(files: File[]) {
  console.log('[DocumentManagement] Uploading', files.length, 'files');

  uploadPlaceholder.style.display = 'none';
  uploadProgressList.style.display = 'block';
  uploadProgressList.innerHTML = '';

  for (const file of files) {
    await uploadFile(file);
  }

  await loadDocuments();

  setTimeout(() => {
    uploadPlaceholder.style.display = 'block';
    uploadProgressList.style.display = 'none';
    uploadProgressList.innerHTML = '';
  }, 3000);
}

async function uploadFile(file: File) {
  const progressItem = createProgressItem(file.name);
  uploadProgressList.appendChild(progressItem);
  
  const progressBar = progressItem.querySelector('.upload-progress-fill') as HTMLElement;
  const progressText = progressItem.querySelector('.upload-percentage') as HTMLElement;
  const statusText = progressItem.querySelector('.upload-status-text') as HTMLElement;
  
  try {
    await uploadDocument(file, (progress: UploadProgress) => {
      progressBar.style.width = `${progress.percentage}%`;
      progressText.textContent = `${progress.percentage}%`;
    });

    progressBar.style.width = '100%';
    progressText.textContent = '100%';
    statusText.textContent = 'Upload complete! Processing embeddings...';
    statusText.classList.add('success');
    
    showUploadStatus(`Successfully uploaded ${file.name}`, false);
    
  } catch (error) {
    statusText.textContent = `Error: ${error instanceof Error ? error.message : 'Upload failed'}`;
    statusText.classList.add('error');
    
    showUploadStatus(`Failed to upload ${file.name}`, true);
    console.error('[DocumentManagement] Upload error:', error);
  }
}

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

function showUploadStatus(message: string, isError: boolean) {
  uploadStatus.style.display = 'flex';
  uploadStatus.classList.toggle('error', isError);
  
  const statusMessage = uploadStatus.querySelector('.status-message') as HTMLElement;
  const statusIcon = uploadStatus.querySelector('.status-icon i') as HTMLElement;
  
  statusMessage.textContent = message;
  statusIcon.className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
  
  setTimeout(() => {
    uploadStatus.style.display = 'none';
  }, 5000);
}

async function loadDocuments() {
  console.log('[DocumentManagement] Loading documents...');

  documentsLoading.style.display = 'block';
  documentsEmpty.style.display = 'none';
  documentsError.style.display = 'none';
  documentsGrid.style.display = 'none';
  
  try {
    documents = await listDocuments();
    console.log('[DocumentManagement] Loaded', documents.length, 'documents');

    updateDocumentCount(documents.length);

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

function renderDocuments(docs: Document[]) {
  documentsGrid.innerHTML = docs.map(doc => createDocumentCard(doc)).join('');

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

function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'fa-file-pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word';
  if (mimeType.includes('text')) return 'fa-file-alt';
  if (mimeType.includes('markdown')) return 'fa-file-code';
  return 'fa-file';
}

function updateDocumentCount(count: number) {
  const countNumber = documentsCount.querySelector('.count-number') as HTMLElement;
  const countLabel = documentsCount.querySelector('.count-label') as HTMLElement;
  
  if (countNumber) countNumber.textContent = count.toString();
  if (countLabel) countLabel.textContent = count === 1 ? 'document' : 'documents';
}

async function handleDownload(filename: string, originalName: string) {
  try {
    console.log('[DocumentManagement] Downloading:', originalName);
    await downloadDocument(filename, originalName);
  } catch (error) {
    console.error('[DocumentManagement] Download error:', error);
    alert('Failed to download document. Please try again.');
  }
}

async function handleDelete(filename: string) {
  try {
    console.log('[DocumentManagement] Deleting:', filename);
    await deleteDocument(filename);

    await loadDocuments();
    
    showUploadStatus('Document deleted successfully', false);
  } catch (error) {
    console.error('[DocumentManagement] Delete error:', error);
    alert('Failed to delete document. Please try again.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDocumentManagement);
} else {
  initializeDocumentManagement();
}
