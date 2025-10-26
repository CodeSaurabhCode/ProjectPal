import fs from 'fs/promises';
import path from 'path';

interface DocumentChunkInfo {
  documentId: string;
  originalName: string;
  chunkCount: number;
  embeddingCount: number;
  processedAt: string;
  chunkIds: string[];
}

interface DocumentTrackingData {
  documents: Record<string, DocumentChunkInfo>;
  totalChunks: number;
  totalDocuments: number;
  lastUpdated: string;
}

export class DocumentTrackingService {
  private static readonly TRACKING_FILE = path.join(process.cwd(), 'embeddings', 'document-tracking.json');
  private static trackingData: DocumentTrackingData | null = null;

  static async initialize(): Promise<void> {
    await this.loadTracking();
  }

  private static async loadTracking(): Promise<void> {
    try {
      const content = await fs.readFile(this.TRACKING_FILE, 'utf-8');
      this.trackingData = JSON.parse(content);
      console.log('[DocumentTracking] Loaded tracking data:', this.trackingData?.totalDocuments, 'documents');
    } catch (error) {
      // File doesn't exist, create new tracking data
      this.trackingData = {
        documents: {},
        totalChunks: 0,
        totalDocuments: 0,
        lastUpdated: new Date().toISOString(),
      };
      await this.saveTracking();
      console.log('[DocumentTracking] Created new tracking file');
    }
  }

  private static async saveTracking(): Promise<void> {
    if (!this.trackingData) return;
    
    this.trackingData.lastUpdated = new Date().toISOString();

    const dir = path.dirname(this.TRACKING_FILE);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(
      this.TRACKING_FILE,
      JSON.stringify(this.trackingData, null, 2),
      'utf-8'
    );
  }

  static async addDocument(
    documentId: string,
    originalName: string,
    chunkCount: number,
    chunkIds: string[]
  ): Promise<void> {
    if (!this.trackingData) {
      await this.loadTracking();
    }

    const info: DocumentChunkInfo = {
      documentId,
      originalName,
      chunkCount,
      embeddingCount: chunkIds.length,
      processedAt: new Date().toISOString(),
      chunkIds,
    };

    this.trackingData!.documents[documentId] = info;
    this.trackingData!.totalChunks += chunkCount;
    this.trackingData!.totalDocuments = Object.keys(this.trackingData!.documents).length;

    await this.saveTracking();
    
    console.log(`[DocumentTracking] Added document: ${originalName} (${chunkCount} chunks)`);
  }

  static async removeDocument(documentId: string): Promise<string[]> {
    if (!this.trackingData) {
      await this.loadTracking();
    }

    const info = this.trackingData!.documents[documentId];
    
    if (!info) {
      console.warn(`[DocumentTracking] Document not found: ${documentId}`);
      return [];
    }

    const chunkIds = info.chunkIds;

    delete this.trackingData!.documents[documentId];
    this.trackingData!.totalChunks -= info.chunkCount;
    this.trackingData!.totalDocuments = Object.keys(this.trackingData!.documents).length;

    await this.saveTracking();
    
    console.log(`[DocumentTracking] Removed document: ${info.originalName} (${chunkIds.length} chunks)`);
    
    return chunkIds;
  }

  static async getDocumentInfo(documentId: string): Promise<DocumentChunkInfo | null> {
    if (!this.trackingData) {
      await this.loadTracking();
    }

    return this.trackingData!.documents[documentId] || null;
  }

  static async getAllDocuments(): Promise<DocumentChunkInfo[]> {
    if (!this.trackingData) {
      await this.loadTracking();
    }

    return Object.values(this.trackingData!.documents);
  }

  /**
   * Get tracking stats
   */
  static async getStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    lastUpdated: string;
  }> {
    if (!this.trackingData) {
      await this.loadTracking();
    }

    return {
      totalDocuments: this.trackingData!.totalDocuments,
      totalChunks: this.trackingData!.totalChunks,
      lastUpdated: this.trackingData!.lastUpdated,
    };
  }
}
