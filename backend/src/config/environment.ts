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

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isDevelopment(): boolean {
    return !this.isProduction();
  }
}

export const envConfig = EnvironmentConfig.getInstance();
