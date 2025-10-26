/**
 * Initialize Embeddings - Simplified Mastra RAG approach
 * 
 * Uses direct Mastra APIs:
 * - MDocument.chunk() for intelligent chunking
 * - OpenAI embeddings
 * - Vector store upsert
 * 
 * Run: npm run init-embeddings
 */

import fs from 'fs/promises';
import { RAGService } from '../services/RAGService';
import { DocumentTrackingService } from '../services/DocumentTrackingService';
import { envConfig } from '../config/environment';

const COLLECTION_NAME = 'pm-handbook';
const HANDBOOK_DOC_ID = 'pm-handbook-initial';

async function initializeEmbeddings() {
  console.log('\n🚀 Mastra RAG Initialization (Simplified)\n');
  console.log(`Environment:`);
  console.log(`  OpenAI: ${envConfig.openAIKey ? '✅' : '❌'}`);
  console.log(`  Handbook: ${envConfig.handbookPath}`);
  console.log(`  Storage: ${envConfig.storageType}\n`);
  
  const startTime = Date.now();
  
  try {
    // Initialize
    console.log('📁 Initializing...');
    await DocumentTrackingService.initialize();
    await RAGService.initialize();
    console.log('✅ Ready\n');
    
    // Load handbook
    console.log('📖 Loading handbook...');
    const content = await fs.readFile(envConfig.handbookPath, 'utf-8');
    console.log(`✅ Loaded (${content.length} chars)\n`);
    
    // Process (chunk → embed → store)
    console.log('🔧 Processing...');
    const stats = await RAGService.processDocument(content, HANDBOOK_DOC_ID, {
      maxSize: 4000,
      overlap: 500,
    });
    console.log(`✅ Complete: ${stats.totalChunks} chunks, ${stats.totalEmbeddings} embeddings (${stats.processingTime}ms)\n`);
    
    // Track the handbook document
    await DocumentTrackingService.addDocument(
      HANDBOOK_DOC_ID,
      'PM_handbook.txt',
      stats.totalChunks,
      stats.chunkIds
    );
    console.log(`✅ Tracked handbook document\n`);
    
    // Verify
    console.log('📊 Verifying...');
    const storageStats = await RAGService.getStats(COLLECTION_NAME);
    console.log(`✅ Storage: ${storageStats.totalDocuments} docs, ${storageStats.dimensions}D vectors\n`);
    
    // Test search
    console.log('🔍 Testing search...');
    const results = await RAGService.search('budget approval', {
      indexName: COLLECTION_NAME,
      topK: 3,
    });
    console.log(`✅ Found ${results.length} results\n`);
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('='.repeat(40));
    console.log('✨ INITIALIZATION COMPLETE');
    console.log('='.repeat(40));
    console.log(`Time: ${duration}s`);
    console.log(`Chunks: ${stats.totalChunks}`);
    console.log(`Embeddings: ${stats.totalEmbeddings}`);
    console.log(`Collection: ${COLLECTION_NAME}\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error instanceof Error ? error.stack : '');
    process.exit(1);
  }
}

// Run
initializeEmbeddings()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal:', error);
    process.exit(1);
  });

export { initializeEmbeddings };
