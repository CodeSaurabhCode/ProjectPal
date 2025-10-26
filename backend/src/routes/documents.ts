import { Router, Request, Response } from 'express';
import multer from 'multer';
import { DocumentStorageService } from '../services/DocumentStorageService';
import { RAGService } from '../services/RAGService';
import { DocumentTrackingService } from '../services/DocumentTrackingService';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only text, PDF, and Word documents are allowed.'));
    }
  },
});

router.post('/upload', upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[DocumentAPI] Uploading document:', req.file.originalname);

    const documentMetadata = await DocumentStorageService.uploadDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    console.log('[DocumentAPI] Document uploaded:', documentMetadata.id);

    let textContent: string;
    if (req.file.mimetype === 'text/plain' || req.file.mimetype === 'text/markdown') {
      textContent = req.file.buffer.toString('utf-8');
    } else {
      // For PDFs and other formats, you'd need to add parsing libraries
      return res.status(400).json({ 
        error: 'PDF and DOCX parsing not yet implemented. Please upload .txt or .md files for now.',
        document: documentMetadata 
      });
    }

    // 3. Process document using Mastra RAG (chunking + embedding + storage)
    // All documents go into the 'pm-handbook' index
    console.log('[DocumentAPI] Processing document with Mastra RAG...');
    const stats = await RAGService.processDocument(textContent, documentMetadata.id, {
      maxSize: 4000,
      overlap: 500,
    });

    // 4. Track document and its chunks
    await DocumentTrackingService.addDocument(
      documentMetadata.id,
      documentMetadata.originalName,
      stats.totalChunks,
      stats.chunkIds
    );

    console.log('[DocumentAPI] ✅ Document processing complete');

    res.json({
      success: true,
      document: documentMetadata,
      processing: {
        chunks: stats.totalChunks,
        embeddings: stats.totalEmbeddings,
        processingTime: stats.processingTime,
      },
    });
  } catch (error) {
    console.error('[DocumentAPI] Error processing document:', error);
    res.status(500).json({
      error: 'Failed to process document',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('[DocumentAPI] Listing documents...');
    const documents = await DocumentStorageService.listDocuments();
    
    res.json({
      success: true,
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error('[DocumentAPI] Error listing documents:', error);
    res.status(500).json({
      error: 'Failed to list documents',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});


router.get('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    console.log('[DocumentAPI] Downloading document:', filename);

    const fileBuffer = await DocumentStorageService.getDocument(filename);
    
    // Get metadata to set proper content type
    const documents = await DocumentStorageService.listDocuments();
    const document = documents.find(d => d.filename === filename);

    if (document) {
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    }

    res.send(fileBuffer);
  } catch (error) {
    console.error('[DocumentAPI] Error downloading document:', error);
    res.status(404).json({
      error: 'Document not found',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});


router.delete('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    console.log('[DocumentAPI] Deleting document:', filename);

    // Get chunk IDs from tracking service
    const chunkIds = await DocumentTrackingService.removeDocument(filename);
    
    if (chunkIds.length > 0) {
      // Delete specific chunks from pm-handbook index
      await RAGService.deleteDocumentChunks(chunkIds);
      console.log(`[DocumentAPI] Deleted ${chunkIds.length} chunks from pm-handbook index`);
    }
    
    // Delete document from storage
    await DocumentStorageService.deleteDocument(filename);

    res.json({
      success: true,
      message: 'Document and embeddings deleted successfully',
      deletedChunks: chunkIds.length,
    });
  } catch (error) {
    console.error('[DocumentAPI] Error deleting document:', error);
    res.status(500).json({
      error: 'Failed to delete document',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
