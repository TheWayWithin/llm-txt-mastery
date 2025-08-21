import * as https from 'https';

export class ConnectionPoolManager {
  private agents: Map<string, https.Agent>;
  private lastUsed: Map<string, number>;
  private readonly maxAgents = 50;
  private readonly maxSocketsPerAgent = 10;
  private readonly idleTimeout = 60000; // 1 minute
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    this.agents = new Map();
    this.lastUsed = new Map();
    
    // Cleanup idle connections every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupIdleAgents(), 300000);
    
    console.log('ConnectionPoolManager initialized with max agents:', this.maxAgents);
  }
  
  getAgent(url: string): https.Agent {
    const hostname = new URL(url).hostname;
    
    if (!this.agents.has(hostname)) {
      // Evict oldest agent if at capacity
      if (this.agents.size >= this.maxAgents) {
        this.evictOldestAgent();
      }
      
      const agent = new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: this.maxSocketsPerAgent,
        maxFreeSockets: 5,
        timeout: 30000,
        scheduling: 'lifo' as const // Last-in-first-out for better connection reuse
      });
      
      this.agents.set(hostname, agent);
      console.log(`Created new agent for ${hostname} (total: ${this.agents.size})`);
    }
    
    this.lastUsed.set(hostname, Date.now());
    return this.agents.get(hostname)!;
  }
  
  private cleanupIdleAgents(): void {
    const now = Date.now();
    const hostnamesToCleanup: string[] = [];
    
    this.lastUsed.forEach((lastUsedTime, hostname) => {
      if (now - lastUsedTime > this.idleTimeout) {
        hostnamesToCleanup.push(hostname);
      }
    });
    
    for (const hostname of hostnamesToCleanup) {
      const agent = this.agents.get(hostname);
      if (agent) {
        agent.destroy();
        this.agents.delete(hostname);
        this.lastUsed.delete(hostname);
        console.log(`Cleaned up idle agent for ${hostname}`);
      }
    }
    
    if (hostnamesToCleanup.length > 0) {
      console.log(`Cleaned up ${hostnamesToCleanup.length} idle agents. Active agents: ${this.agents.size}`);
    }
  }
  
  private evictOldestAgent(): void {
    let oldestHostname = '';
    let oldestTime = Date.now();
    
    this.lastUsed.forEach((time, hostname) => {
      if (time < oldestTime) {
        oldestTime = time;
        oldestHostname = hostname;
      }
    });
    
    if (oldestHostname) {
      const agent = this.agents.get(oldestHostname);
      if (agent) {
        agent.destroy();
        this.agents.delete(oldestHostname);
        this.lastUsed.delete(oldestHostname);
        console.log(`Evicted oldest agent for ${oldestHostname} (was ${Math.round((Date.now() - oldestTime) / 1000)}s old)`);
      }
    }
  }
  
  // Graceful shutdown
  destroy(): void {
    console.log(`Destroying connection pool with ${this.agents.size} active agents`);
    
    // Clear the cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Destroy all agents
    this.agents.forEach((agent, hostname) => {
      agent.destroy();
      console.log(`Destroyed agent for ${hostname}`);
    });
    
    this.agents.clear();
    this.lastUsed.clear();
  }
  
  // Metrics for monitoring
  getStats(): { activeAgents: number, hostnames: string[], memoryUsage: string } {
    const memoryUsage = process.memoryUsage();
    const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    return {
      activeAgents: this.agents.size,
      hostnames: Array.from(this.agents.keys()),
      memoryUsage: `${memoryMB}MB`
    };
  }
}

// Singleton instance
export const connectionPool = new ConnectionPoolManager();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, destroying connection pool...');
  connectionPool.destroy();
});

process.on('SIGINT', () => {
  console.log('SIGINT received, destroying connection pool...');
  connectionPool.destroy();
});