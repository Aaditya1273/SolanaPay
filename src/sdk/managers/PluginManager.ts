import { EventEmitter } from 'events';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: 'analytics' | 'defi' | 'marketplace' | 'bridge' | 'security' | 'utility';
  status: 'active' | 'inactive' | 'error' | 'loading';
  permissions: string[];
  config: Record<string, any>;
  hooks: string[];
  dependencies?: string[];
  apiEndpoints?: PluginEndpoint[];
  createdAt: number;
  updatedAt: number;
}

export interface PluginEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  handler: string;
  middleware?: string[];
}

export interface PluginHook {
  name: string;
  type: 'before' | 'after' | 'async';
  target: string;
  handler: Function;
  priority: number;
}

export interface PluginRegistry {
  plugins: Map<string, Plugin>;
  hooks: Map<string, PluginHook[]>;
  endpoints: Map<string, PluginEndpoint>;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  category: Plugin['category'];
  permissions: string[];
  dependencies?: string[];
  main: string;
  hooks?: string[];
  endpoints?: PluginEndpoint[];
  config?: Record<string, any>;
}

export class PluginManager extends EventEmitter {
  private registry: PluginRegistry;
  private isInitialized = false;
  private pluginInstances: Map<string, any> = new Map();

  constructor() {
    super();
    this.registry = {
      plugins: new Map(),
      hooks: new Map(),
      endpoints: new Map()
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.loadInstalledPlugins();
    await this.initializeCorePlugins();
    
    this.isInitialized = true;
    this.emit('initialized');
  }

  private async loadInstalledPlugins(): Promise<void> {
    console.log('Loading installed plugins...');
    
    const demoPlugins = this.createDemoPlugins();
    for (const plugin of demoPlugins) {
      this.registry.plugins.set(plugin.id, plugin);
    }
  }

  private async initializeCorePlugins(): Promise<void> {
    await this.activatePlugin('analytics-dashboard');
    await this.activatePlugin('security-monitor');
    console.log('Core plugins initialized');
  }

  async installPlugin(manifest: PluginManifest, code: string): Promise<string> {
    const pluginId = `${manifest.name}_${manifest.version}`;
    
    await this.validatePlugin(manifest, code);
    
    const plugin: Plugin = {
      id: pluginId,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      category: manifest.category,
      status: 'inactive',
      permissions: manifest.permissions,
      config: manifest.config || {},
      hooks: manifest.hooks || [],
      dependencies: manifest.dependencies,
      apiEndpoints: manifest.endpoints,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.registry.plugins.set(pluginId, plugin);
    this.pluginInstances.set(pluginId, { code, manifest });
    
    this.emit('pluginInstalled', plugin);
    return pluginId;
  }

  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.registry.plugins.get(pluginId);
    if (!plugin || plugin.status === 'active') return;

    plugin.status = 'loading';
    this.emit('pluginStatusChanged', plugin);

    try {
      await this.checkDependencies(plugin);
      await this.initializePlugin(plugin);
      await this.registerPluginHooks(plugin);
      await this.registerPluginEndpoints(plugin);
      
      plugin.status = 'active';
      plugin.updatedAt = Date.now();
      
      this.emit('pluginActivated', plugin);
    } catch (error) {
      plugin.status = 'error';
      this.emit('pluginError', { plugin, error });
      throw error;
    }
  }

  getPlugins(filter?: {
    category?: Plugin['category'];
    status?: Plugin['status'];
  }): Plugin[] {
    let plugins = Array.from(this.registry.plugins.values());

    if (filter) {
      if (filter.category) {
        plugins = plugins.filter(p => p.category === filter.category);
      }
      if (filter.status) {
        plugins = plugins.filter(p => p.status === filter.status);
      }
    }

    return plugins;
  }

  private async validatePlugin(manifest: PluginManifest, code: string): Promise<void> {
    if (!manifest.name || !manifest.version) {
      throw new Error('Plugin manifest missing required fields');
    }
  }

  private async checkDependencies(plugin: Plugin): Promise<void> {
    if (!plugin.dependencies) return;
    
    for (const dep of plugin.dependencies) {
      const depPlugin = this.registry.plugins.get(dep);
      if (!depPlugin || depPlugin.status !== 'active') {
        throw new Error(`Dependency ${dep} not available`);
      }
    }
  }

  private async initializePlugin(plugin: Plugin): Promise<void> {
    console.log(`Initializing plugin: ${plugin.name}`);
  }

  private async registerPluginHooks(plugin: Plugin): Promise<void> {
    plugin.hooks.forEach(hookName => {
      if (!this.registry.hooks.has(hookName)) {
        this.registry.hooks.set(hookName, []);
      }
    });
  }

  private async registerPluginEndpoints(plugin: Plugin): Promise<void> {
    plugin.apiEndpoints?.forEach(endpoint => {
      const key = `${endpoint.method}:${endpoint.path}`;
      this.registry.endpoints.set(key, endpoint);
    });
  }

  private createDemoPlugins(): Plugin[] {
    return [
      {
        id: 'analytics-dashboard',
        name: 'Analytics Dashboard',
        version: '1.0.0',
        description: 'Advanced analytics and reporting dashboard',
        author: 'OmniFlow Team',
        category: 'analytics',
        status: 'inactive',
        permissions: ['read:analytics', 'write:reports'],
        config: { refreshInterval: 30000 },
        hooks: ['beforeAnalyticsQuery', 'afterReportGeneration'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'security-monitor',
        name: 'Security Monitor',
        version: '1.0.0',
        description: 'Real-time security monitoring and threat detection',
        author: 'OmniFlow Team',
        category: 'security',
        status: 'inactive',
        permissions: ['read:transactions', 'write:alerts'],
        config: { alertThreshold: 0.8 },
        hooks: ['beforeTransaction', 'afterSecurityScan'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
  }
}
