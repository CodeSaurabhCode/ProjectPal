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

  get allowedOrigins(): readonly string[] {
    return [
      'http://localhost:4321',
      'http://localhost:3000',
      'http://127.0.0.1:4321'
    ] as const;
  }

  get handbookPath(): string {
    return path.join(process.cwd(), 'docs', 'PM_handbook.txt');
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isDevelopment(): boolean {
    return !this.isProduction();
  }
}

export const envConfig = EnvironmentConfig.getInstance();
