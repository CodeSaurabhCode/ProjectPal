import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { envConfig } from './config/environment';
import { DocumentStorageService } from './services/DocumentStorageService';
import { RAGService } from './services/RAGService';
import { DocumentTrackingService } from './services/DocumentTrackingService';
import documentRoutes from './routes/documents';
import chatRoutes from './routes/chat';

const app = express();
const port = envConfig.port;

const HANDBOOK_DOC_ID = 'pm-handbook-initial';


app.use(cors({
  origin: envConfig.allowedOrigins as unknown as string[],
  credentials: true
}));
app.use(express.json());

(async () => {
  try {
    console.log('🔧 Initializing services...');
    await DocumentStorageService.initialize();
    await DocumentTrackingService.initialize();
    await RAGService.initialize();
    console.log('✅ Services initialized successfully');

    await initializePMHandbook();
    
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
  }
})();

app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    agent: 'projectAssistant'
  });
});


app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🤖 Chat endpoint: http://localhost:${port}/api/chat`);
  console.log(`💚 Health check: http://localhost:${port}/api/health`);
  
  try {
    const hasKey = !!envConfig.openAIKey;
    console.log(`🔑 OpenAI API Key: ${hasKey ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`🔑 OpenAI API Key: ❌ (${error instanceof Error ? error.message : 'Not configured'})`);
  }
});

async function initializePMHandbook() {
  try {
    console.log('\n📚 Checking PM Handbook embeddings...');

    const trackedDocs = await DocumentTrackingService.getAllDocuments();
    const handbookExists = trackedDocs.some((doc: any) => doc.id === HANDBOOK_DOC_ID);
    
    if (handbookExists) {
      console.log('✅ PM Handbook already initialized\n');
      return;
    }
    
    console.log('🔄 Initializing PM Handbook embeddings...');

    const content = await fs.readFile(envConfig.handbookPath, 'utf-8');
    console.log(`📖 Loaded PM_handbook.txt (${content.length} characters)`);

    const startTime = Date.now();
    const stats = await RAGService.processDocument(content, HANDBOOK_DOC_ID, {
      maxSize: 4000,
      overlap: 500,
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Created ${stats.totalChunks} chunks, ${stats.totalEmbeddings} embeddings (${duration}ms)`);
    
    await DocumentTrackingService.addDocument(
      HANDBOOK_DOC_ID,
      'PM_handbook.txt',
      stats.totalChunks,
      stats.chunkIds
    );
    
    console.log(`✅ PM Handbook initialized successfully\n`);
    
  } catch (error) {
    console.error('❌ Failed to initialize PM Handbook:', error);
    console.error('⚠️  Server will continue, but RAG queries may not work properly\n');
  }
}

export default app;