import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import fs from 'fs/promises';
import path from 'path';
import { envConfig } from '../config/environment';

export interface DocumentMetadata {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  url: string;
}

export class DocumentStorageService {
  private static readonly LOCAL_DOCS_PATH = path.join(process.cwd(), 'docs', 'uploads');
  private static blobContainerClient: ContainerClient | null = null;

  static async initialize(): Promise<void> {
    if (envConfig.storageMode === 'local') {
      try {
        await fs.mkdir(this.LOCAL_DOCS_PATH, { recursive: true });
        console.log('[DocumentStorage] Local storage initialized at:', this.LOCAL_DOCS_PATH);
      } catch (error) {
        console.error('[DocumentStorage] Error initializing local storage:', error);
        throw error;
      }
    } else {
      console.log('[DocumentStorage] Initializing Azure Blob Storage...');
      try {
        await this.initializeBlobStorage();
        console.log('[DocumentStorage] ✅ Blob Storage initialized');
      } catch (error) {
        console.error('[DocumentStorage] Error initializing Blob Storage:', error);
        throw error;
      }
    }
  }

  private static async initializeBlobStorage(): Promise<void> {
    const connectionString = envConfig.blobStorageConnectionString;
    
    if (!connectionString) {
      throw new Error('BLOB_STORAGE_CONNECTION_STRING not found in environment');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerName = envConfig.blobStorageContainerName || 'documents';
    
    // Create container if it doesn't exist
    this.blobContainerClient = blobServiceClient.getContainerClient(containerName);
    await this.blobContainerClient.createIfNotExists({
      access: 'blob' // Allow public read access to blobs
    });

    console.log('[DocumentStorage] Blob container ready:', containerName);
  }

  static async uploadDocument(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<DocumentMetadata> {
    const id = `${Date.now()}-${filename}`;
    const uploadedAt = new Date().toISOString();

    if (envConfig.storageMode === 'local') {
      return await this.uploadLocal(fileBuffer, id, filename, mimeType, uploadedAt);
    } else {
      return await this.uploadBlob(fileBuffer, id, filename, mimeType, uploadedAt);
    }
  }

  static async listDocuments(): Promise<DocumentMetadata[]> {
    if (envConfig.storageMode === 'local') {
      return await this.listLocal();
    } else {
      return await this.listBlob();
    }
  }

  static async getDocument(filename: string): Promise<Buffer> {
    if (envConfig.storageMode === 'local') {
      return await this.getLocal(filename);
    } else {
      return await this.getBlob(filename);
    }
  }

  static async deleteDocument(filename: string): Promise<void> {
    if (envConfig.storageMode === 'local') {
      await this.deleteLocal(filename);
    } else {
      await this.deleteBlob(filename);
    }
  }

  private static async uploadLocal(
    fileBuffer: Buffer,
    id: string,
    originalName: string,
    mimeType: string,
    uploadedAt: string
  ): Promise<DocumentMetadata> {
    const filePath = path.join(this.LOCAL_DOCS_PATH, id);
    
    try {
      await fs.writeFile(filePath, fileBuffer);
      
      const metadata: DocumentMetadata = {
        id,
        filename: id,
        originalName,
        size: fileBuffer.length,
        mimeType,
        uploadedAt,
        url: `/api/documents/${id}`
      };

      const metadataPath = path.join(this.LOCAL_DOCS_PATH, `${id}.meta.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      console.log('[DocumentStorage] Uploaded locally:', id);
      return metadata;
    } catch (error) {
      console.error('[DocumentStorage] Error uploading locally:', error);
      throw error;
    }
  }

  private static async listLocal(): Promise<DocumentMetadata[]> {
    try {
      const files = await fs.readdir(this.LOCAL_DOCS_PATH);
      const metadataFiles = files.filter(f => f.endsWith('.meta.json'));
      
      const documents: DocumentMetadata[] = [];
      for (const metaFile of metadataFiles) {
        const metaPath = path.join(this.LOCAL_DOCS_PATH, metaFile);
        const content = await fs.readFile(metaPath, 'utf-8');
        documents.push(JSON.parse(content));
      }

      return documents.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
    } catch (error) {
      console.error('[DocumentStorage] Error listing local documents:', error);
      return [];
    }
  }

  private static async getLocal(filename: string): Promise<Buffer> {
    const filePath = path.join(this.LOCAL_DOCS_PATH, filename);
    return await fs.readFile(filePath);
  }

  private static async deleteLocal(filename: string): Promise<void> {
    const filePath = path.join(this.LOCAL_DOCS_PATH, filename);
    const metadataPath = path.join(this.LOCAL_DOCS_PATH, `${filename}.meta.json`);
    
    try {
      await fs.unlink(filePath);
      await fs.unlink(metadataPath);
      console.log('[DocumentStorage] Deleted locally:', filename);
    } catch (error) {
      console.error('[DocumentStorage] Error deleting locally:', error);
      throw error;
    }
  }
  
  private static async uploadBlob(
    fileBuffer: Buffer,
    id: string,
    originalName: string,
    mimeType: string,
    uploadedAt: string
  ): Promise<DocumentMetadata> {
    if (!this.blobContainerClient) {
      await this.initializeBlobStorage();
    }

    if (!this.blobContainerClient) {
      throw new Error('Blob container not initialized');
    }

    try {
      const blobClient = this.blobContainerClient.getBlockBlobClient(id);
      
      await blobClient.upload(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: {
          blobContentType: mimeType
        },
        metadata: {
          originalName,
          uploadedAt,
          size: fileBuffer.length.toString()
        }
      });

      const metadata: DocumentMetadata = {
        id,
        filename: id,
        originalName,
        size: fileBuffer.length,
        mimeType,
        uploadedAt,
        url: blobClient.url
      };

      console.log('[DocumentStorage] Uploaded to blob:', id);
      return metadata;
    } catch (error) {
      console.error('[DocumentStorage] Error uploading to blob:', error);
      throw error;
    }
  }

  private static async listBlob(): Promise<DocumentMetadata[]> {
    if (!this.blobContainerClient) {
      await this.initializeBlobStorage();
    }

    if (!this.blobContainerClient) {
      throw new Error('Blob container not initialized');
    }

    try {
      const documents: DocumentMetadata[] = [];
      
      for await (const blob of this.blobContainerClient.listBlobsFlat({ includeMetadata: true })) {
        const blobClient = this.blobContainerClient.getBlobClient(blob.name);
        
        documents.push({
          id: blob.name,
          filename: blob.name,
          originalName: blob.metadata?.originalName || blob.name,
          size: blob.properties.contentLength || 0,
          mimeType: blob.properties.contentType || 'application/octet-stream',
          uploadedAt: blob.metadata?.uploadedAt || blob.properties.createdOn?.toISOString() || '',
          url: blobClient.url
        });
      }

      return documents.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
    } catch (error) {
      console.error('[DocumentStorage] Error listing blobs:', error);
      return [];
    }
  }

  private static async getBlob(filename: string): Promise<Buffer> {
    if (!this.blobContainerClient) {
      await this.initializeBlobStorage();
    }

    if (!this.blobContainerClient) {
      throw new Error('Blob container not initialized');
    }

    try {
      const blobClient = this.blobContainerClient.getBlobClient(filename);
      const downloadResponse = await blobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('No stream body in response');
      }

      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('[DocumentStorage] Error downloading blob:', error);
      throw error;
    }
  }

  private static async deleteBlob(filename: string): Promise<void> {
    if (!this.blobContainerClient) {
      await this.initializeBlobStorage();
    }

    if (!this.blobContainerClient) {
      throw new Error('Blob container not initialized');
    }

    try {
      const blobClient = this.blobContainerClient.getBlobClient(filename);
      await blobClient.delete();
      console.log('[DocumentStorage] Deleted from blob:', filename);
    } catch (error) {
      console.error('[DocumentStorage] Error deleting blob:', error);
      throw error;
    }
  }
}
