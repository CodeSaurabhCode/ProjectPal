import { Router, Request, Response } from 'express';
import multer from 'multer';
import { DocumentStorageService } from '../services/DocumentStorageService';
import { RAGService } from '../services/RAGService';
import { DocumentTrackingService } from '../services/DocumentTrackingService';
import { DocumentParserService } from '../services/DocumentParserService';

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
      'text/x-markdown',
    ];

    const allowedExtensions = ['.txt', '.pdf', '.doc', '.docx', '.md', '.markdown'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      console.log(`[DocumentAPI] Rejected file: ${file.originalname} (MIME: ${file.mimetype})`);
      cb(new Error('Invalid file type. Only text, PDF, and Markdown documents are allowed.'));
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
    try {
      textContent = await DocumentParserService.extractText(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );
    } catch (parseError) {
      console.error('[DocumentAPI] Error parsing document:', parseError);
      return res.status(400).json({ 
        error: parseError instanceof Error ? parseError.message : 'Failed to parse document',
        document: documentMetadata 
      });
    }

    const validation = DocumentParserService.validateExtractedText(textContent, req.file.originalname);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        document: documentMetadata
      });
    }

    console.log(`[DocumentAPI] Extracted ${textContent.length} characters from ${req.file.originalname}`);
    console.log('[DocumentAPI] Processing document with RAG...');
    const stats = await RAGService.processDocument(textContent, documentMetadata.id, {
      maxSize: 4000,
      overlap: 500,
    });

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
        textLength: textContent.length,
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

    const chunkIds = await DocumentTrackingService.removeDocument(filename);
    
    if (chunkIds.length > 0) {
      await RAGService.deleteDocumentChunks(chunkIds);
      console.log(`[DocumentAPI] Deleted ${chunkIds.length} chunks from pm-handbook index`);
    }
    
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
