import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

interface KubiduConfig {
  apiToken?: string;
  apiUrl: string;
  currentProject?: string;
  currentService?: string;
  userId?: string;
  userEmail?: string;
  theme: 'auto' | 'light' | 'dark';
}

const defaultConfig: KubiduConfig = {
  apiUrl: 'https://api.kubidu.dev',
  theme: 'auto',
};

class ConfigManager {
  private configDir: string;
  private configPath: string;
  private config: KubiduConfig;

  constructor() {
    this.configDir = path.join(os.homedir(), '.config', 'kubidu');
    this.configPath = path.join(this.configDir, 'config.json');
    
    // Ensure config directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    // Load config
    this.config = this.load();
  }

  private load(): KubiduConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        return { ...defaultConfig, ...JSON.parse(content) };
      }
    } catch (error) {
      // Ignore parse errors
    }
    return { ...defaultConfig };
  }

  private save(): void {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  get<K extends keyof KubiduConfig>(key: K): KubiduConfig[K] {
    return this.config[key];
  }

  set<K extends keyof KubiduConfig>(key: K, value: KubiduConfig[K]): void {
    this.config[key] = value;
    this.save();
  }

  delete<K extends keyof KubiduConfig>(key: K): void {
    delete this.config[key];
    this.save();
  }

  getAll(): KubiduConfig {
    return { ...this.config };
  }

  clear(): void {
    this.config = { ...defaultConfig };
    this.save();
  }

  isLoggedIn(): boolean {
    return !!this.config.apiToken;
  }

  getApiUrl(): string {
    return process.env.KUBIDU_API_URL || this.config.apiUrl;
  }

  getApiToken(): string | undefined {
    return process.env.KUBIDU_API_TOKEN || this.config.apiToken;
  }

  // Project-level config (kubidu.yaml in current directory)
  getProjectConfig(): ProjectConfig | null {
    const configPaths = ['kubidu.yaml', 'kubidu.yml', 'kubidu.json'];
    
    for (const configPath of configPaths) {
      const fullPath = path.join(process.cwd(), configPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (configPath.endsWith('.json')) {
          return JSON.parse(content);
        }
        // Simple YAML parsing for basic cases
        return this.parseSimpleYaml(content);
      }
    }
    return null;
  }

  private parseSimpleYaml(content: string): ProjectConfig {
    const config: ProjectConfig = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const [key, ...valueParts] = trimmed.split(':');
      if (key && valueParts.length) {
        const value = valueParts.join(':').trim();
        (config as any)[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }
    
    return config;
  }
}

export interface ProjectConfig {
  name?: string;
  service?: string;
  build?: {
    dockerfile?: string;
    context?: string;
  };
  deploy?: {
    replicas?: number;
    port?: number;
    healthcheck?: string;
  };
  env?: Record<string, string>;
}

export const config = new ConfigManager();
export default config;
