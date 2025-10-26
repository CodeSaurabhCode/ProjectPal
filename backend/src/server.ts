import express from 'express';
import cors from 'cors';
import { envConfig } from './config/environment';
import { DocumentStorageService } from './services/DocumentStorageService';
import { RAGService } from './services/RAGService';
import { DocumentTrackingService } from './services/DocumentTrackingService';
import documentRoutes from './routes/documents';
import chatRoutes from './routes/chat';

const app = express();
const port = envConfig.port;

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

export default app;