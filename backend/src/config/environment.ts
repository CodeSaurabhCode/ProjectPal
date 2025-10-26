import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

export class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private loaded: boolean = false;

  private constructor() {
    this.loadEnvironment();
  }

  static getInstance(): EnvironmentConfig {
    if (!this.instance) {
      this.instance = new EnvironmentConfig();
    }
    return this.instance;
  }

  private loadEnvironment(): void {
    if (this.loaded) return;

    const envPath = path.join(process.cwd(), '.env');
    
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
      this.loaded = true;
      console.log('[Environment] Loaded .env file (overriding system vars)');
    } else {
      console.error('❌ .env file not found at:', envPath);
    }
  }

  get openAIKey(): string {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    return key;
  }

  get port(): number {
    return parseInt(process.env.PORT || '3001', 10);
  }

  get allowedOrigins(): string[] {
    const origins = [
      'http://localhost:4321',
      'http://localhost:3000',
      'http://127.0.0.1:4321'
    ];

    // Add custom allowed origins from environment variable
    const customOrigins = process.env.ALLOWED_ORIGINS;
    if (customOrigins) {
      origins.push(...customOrigins.split(',').map(origin => origin.trim()));
    }

    // In production, allow Azure Static Web Apps domain
    if (this.isProduction()) {
      const frontendUrl = process.env.FRONTEND_URL;
      if (frontendUrl) {
        origins.push(frontendUrl);
        // Also add without protocol for flexibility
        origins.push(`https://${frontendUrl.replace(/^https?:\/\//, '')}`);
      }
    }

    return origins;
  }

  get handbookPath(): string {
    return path.join(process.cwd(), 'docs', 'PM_handbook.txt');
  }

  // Memory Storage Configuration
  get memoryStorageType(): 'file' | 'cosmos' {
    const type = process.env.MEMORY_STORAGE_TYPE?.toLowerCase();
    return type === 'cosmos' ? 'cosmos' : 'file';
  }

  get memoryDir(): string {
    return process.env.MEMORY_DIR || path.join(process.cwd(), 'memory');
  }

  get storageType(): 'local' | 'cosmos' {
    const type = process.env.VECTOR_STORAGE_TYPE?.toLowerCase();
    return type === 'cosmos' ? 'cosmos' : 'local';
  }

  get storageMode(): 'local' | 'blob' {
    const mode = process.env.STORAGE_MODE?.toLowerCase();
    return mode === 'blob' ? 'blob' : 'local';
  }

  get blobStorageConnectionString(): string | undefined {
    return process.env.BLOB_STORAGE_CONNECTION_STRING || process.env.AZURE_STORAGE_CONNECTION_STRING;
  }

  get blobStorageContainerName(): string {
    return process.env.BLOB_STORAGE_CONTAINER || 'documents';
  }

  // Cosmos DB Configuration
  get cosmosDbEndpoint(): string | undefined {
    return process.env.COSMOS_DB_ENDPOINT;
  }

  get cosmosDbKey(): string | undefined {
    return process.env.COSMOS_DB_KEY;
  }

  get cosmosDbDatabase(): string {
    return process.env.COSMOS_DB_DATABASE || 'ProjectPalDB';
  }

  get cosmosDbContainer(): string {
    return process.env.COSMOS_DB_CONTAINER || 'Conversations';
  }

  get cosmosConnectionString(): string | undefined {
    // Support both connection string and endpoint+key
    const connStr = process.env.COSMOS_CONNECTION_STRING;
    if (connStr) return connStr;

    const endpoint = this.cosmosDbEndpoint;
    const key = this.cosmosDbKey;
    if (endpoint && key) {
      return `AccountEndpoint=${endpoint};AccountKey=${key};`;
    }

    return undefined;
  }

  get cosmosDatabaseName(): string {
    return process.env.COSMOS_VECTOR_DATABASE || 'ProjectPal';
  }

  get cosmosContainerName(): string {
    return process.env.COSMOS_VECTOR_CONTAINER || 'embeddings';
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isDevelopment(): boolean {
    return !this.isProduction();
  }
}

export const envConfig = EnvironmentConfig.getInstance();
