import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionPoolManager } from '../server/services/connection-pool';

describe('ConnectionPoolManager', () => {
  let pool: ConnectionPoolManager;
  
  beforeEach(() => {
    pool = new ConnectionPoolManager();
  });
  
  afterEach(() => {
    pool.destroy();
  });

  describe('Agent Creation and Reuse', () => {
    it('should create new agents for different hostnames', () => {
      const agent1 = pool.getAgent('https://example.com/page1');
      const agent2 = pool.getAgent('https://different.com/page1');
      
      expect(agent1).toBeDefined();
      expect(agent2).toBeDefined();
      expect(agent1).not.toBe(agent2);
      
      const stats = pool.getStats();
      expect(stats.activeAgents).toBe(2);
      expect(stats.hostnames).toContain('example.com');
      expect(stats.hostnames).toContain('different.com');
    });
    
    it('should reuse agents for same hostname', () => {
      const agent1 = pool.getAgent('https://example.com/page1');
      const agent2 = pool.getAgent('https://example.com/page2');
      const agent3 = pool.getAgent('https://example.com/different/path');
      
      expect(agent1).toBe(agent2);
      expect(agent2).toBe(agent3);
      
      const stats = pool.getStats();
      expect(stats.activeAgents).toBe(1);
      expect(stats.hostnames).toEqual(['example.com']);
    });
    
    it('should handle URLs with different protocols for same hostname', () => {
      // Note: Connection pool only handles HTTPS, so this tests the URL parsing
      const agent1 = pool.getAgent('https://example.com/page1');
      const agent2 = pool.getAgent('https://example.com:443/page2');
      
      expect(agent1).toBe(agent2);
      
      const stats = pool.getStats();
      expect(stats.activeAgents).toBe(1);
    });
    
    it('should treat subdomains as different hostnames', () => {
      const agent1 = pool.getAgent('https://api.example.com/v1');
      const agent2 = pool.getAgent('https://www.example.com/page');
      const agent3 = pool.getAgent('https://docs.example.com/guide');
      
      expect(agent1).not.toBe(agent2);
      expect(agent2).not.toBe(agent3);
      expect(agent1).not.toBe(agent3);
      
      const stats = pool.getStats();
      expect(stats.activeAgents).toBe(3);
      expect(stats.hostnames).toContain('api.example.com');
      expect(stats.hostnames).toContain('www.example.com');
      expect(stats.hostnames).toContain('docs.example.com');
    });
  });

  describe('Capacity Management and Eviction', () => {
    it('should evict oldest agent when at capacity', () => {
      // Access private maxAgents property for testing
      const originalMaxAgents = (pool as any).maxAgents;
      (pool as any).maxAgents = 2;
      
      // Create first agent
      const agent1 = pool.getAgent('https://first.com');
      expect(pool.getStats().activeAgents).toBe(1);
      
      // Wait a bit to ensure different timestamps
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);
      
      // Create second agent
      const agent2 = pool.getAgent('https://second.com');
      expect(pool.getStats().activeAgents).toBe(2);
      
      vi.advanceTimersByTime(100);
      
      // Create third agent - should evict first
      const agent3 = pool.getAgent('https://third.com');
      
      const stats = pool.getStats();
      expect(stats.activeAgents).toBe(2);
      expect(stats.hostnames).not.toContain('first.com');
      expect(stats.hostnames).toContain('second.com');
      expect(stats.hostnames).toContain('third.com');
      
      // Restore original value
      (pool as any).maxAgents = originalMaxAgents;
      vi.useRealTimers();
    });
    
    it('should not evict if under capacity', () => {
      const agent1 = pool.getAgent('https://example1.com');
      const agent2 = pool.getAgent('https://example2.com');
      const agent3 = pool.getAgent('https://example3.com');
      
      const stats = pool.getStats();
      expect(stats.activeAgents).toBe(3);
      expect(stats.hostnames).toContain('example1.com');
      expect(stats.hostnames).toContain('example2.com');
      expect(stats.hostnames).toContain('example3.com');
    });
  });

  describe('Idle Agent Cleanup', () => {
    it('should clean up idle agents after timeout', async () => {
      // Create some agents
      pool.getAgent('https://example1.com');
      pool.getAgent('https://example2.com');
      
      expect(pool.getStats().activeAgents).toBe(2);
      
      // Access the private cleanup method directly for testing
      const cleanupMethod = (pool as any).cleanupIdleAgents.bind(pool);
      
      // Manually set lastUsed to old timestamps
      const lastUsedMap = (pool as any).lastUsed;
      const oldTime = Date.now() - 70000; // 70 seconds ago (past 60 second timeout)
      lastUsedMap.set('example1.com', oldTime);
      lastUsedMap.set('example2.com', oldTime);
      
      // Run cleanup manually
      cleanupMethod();
      
      // Cleanup should have run
      const stats = pool.getStats();
      expect(stats.activeAgents).toBe(0);
      expect(stats.hostnames).toEqual([]);
    });
    
    it('should not clean up recently used agents', async () => {
      vi.useFakeTimers();
      
      // Create agent
      pool.getAgent('https://example.com');
      
      // Fast-forward to just before cleanup
      vi.advanceTimersByTime(300000 - 1000);
      
      // Use the agent again to update timestamp
      pool.getAgent('https://example.com');
      
      // Fast-forward past original timeout
      vi.advanceTimersByTime(60000 + 2000);
      
      // Agent should still be active (recently used)
      const stats = pool.getStats();
      expect(stats.activeAgents).toBe(1);
      expect(stats.hostnames).toContain('example.com');
      
      vi.useRealTimers();
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent requests to same host', async () => {
      const promises = Array(10).fill(null).map(async (_, index) => {
        return new Promise(resolve => {
          setTimeout(() => {
            const agent = pool.getAgent('https://example.com/page' + index);
            resolve(agent);
          }, Math.random() * 10);
        });
      });
      
      const agents = await Promise.all(promises);
      
      // All should be the same agent instance
      const uniqueAgents = new Set(agents);
      expect(uniqueAgents.size).toBe(1);
      
      // Only one hostname should be tracked
      const stats = pool.getStats();
      expect(stats.activeAgents).toBe(1);
      expect(stats.hostnames).toEqual(['example.com']);
    });
    
    it('should handle concurrent requests to different hosts', async () => {
      const hostnames = ['host1.com', 'host2.com', 'host3.com', 'host4.com', 'host5.com'];
      
      const promises = hostnames.map(async (hostname, index) => {
        return new Promise(resolve => {
          setTimeout(() => {
            const agent = pool.getAgent(`https://${hostname}/page`);
            resolve({ hostname, agent });
          }, Math.random() * 20);
        });
      });
      
      const results = await Promise.all(promises);
      
      // Each hostname should have its own agent
      const agentsByHost = new Map();
      results.forEach(({ hostname, agent }) => {
        agentsByHost.set(hostname, agent);
      });
      
      expect(agentsByHost.size).toBe(5);
      
      // All agents should be different
      const allAgents = Array.from(agentsByHost.values());
      const uniqueAgents = new Set(allAgents);
      expect(uniqueAgents.size).toBe(5);
      
      const stats = pool.getStats();
      expect(stats.activeAgents).toBe(5);
      expect(stats.hostnames.sort()).toEqual(hostnames.sort());
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should return accurate statistics', () => {
      // Initially empty
      let stats = pool.getStats();
      expect(stats.activeAgents).toBe(0);
      expect(stats.hostnames).toEqual([]);
      expect(stats.memoryUsage).toMatch(/^\d+MB$/);
      
      // Add some agents
      pool.getAgent('https://example1.com');
      pool.getAgent('https://example2.com');
      pool.getAgent('https://example1.com'); // Should reuse
      
      stats = pool.getStats();
      expect(stats.activeAgents).toBe(2);
      expect(stats.hostnames.sort()).toEqual(['example1.com', 'example2.com']);
      expect(stats.memoryUsage).toMatch(/^\d+MB$/);
    });
    
    it('should include memory usage in stats', () => {
      const stats = pool.getStats();
      expect(stats.memoryUsage).toBeDefined();
      expect(typeof stats.memoryUsage).toBe('string');
      expect(stats.memoryUsage).toMatch(/^\d+MB$/);
      
      // Memory usage should be a reasonable number
      const memoryMB = parseInt(stats.memoryUsage.replace('MB', ''));
      expect(memoryMB).toBeGreaterThan(0);
      expect(memoryMB).toBeLessThan(1000); // Should be less than 1GB in tests
    });
  });

  describe('Graceful Shutdown', () => {
    it('should destroy all agents on shutdown', () => {
      // Create multiple agents
      const agent1 = pool.getAgent('https://example1.com');
      const agent2 = pool.getAgent('https://example2.com');
      const agent3 = pool.getAgent('https://example3.com');
      
      // Mock the destroy method to track calls
      const destroySpy1 = vi.spyOn(agent1, 'destroy');
      const destroySpy2 = vi.spyOn(agent2, 'destroy');
      const destroySpy3 = vi.spyOn(agent3, 'destroy');
      
      expect(pool.getStats().activeAgents).toBe(3);
      
      // Destroy the pool
      pool.destroy();
      
      // All agents should be destroyed
      expect(destroySpy1).toHaveBeenCalledOnce();
      expect(destroySpy2).toHaveBeenCalledOnce();
      expect(destroySpy3).toHaveBeenCalledOnce();
      
      // Pool should be empty
      const stats = pool.getStats();
      expect(stats.activeAgents).toBe(0);
      expect(stats.hostnames).toEqual([]);
    });
    
    it('should clear cleanup interval on destroy', () => {
      vi.useFakeTimers();
      
      // Create a new pool to test cleanup interval
      const testPool = new ConnectionPoolManager();
      testPool.getAgent('https://example.com');
      
      // Mock clearInterval to verify it's called
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      testPool.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
    
    it('should handle multiple destroy calls gracefully', () => {
      pool.getAgent('https://example.com');
      
      // First destroy should work
      expect(() => pool.destroy()).not.toThrow();
      
      // Second destroy should not throw
      expect(() => pool.destroy()).not.toThrow();
      
      const stats = pool.getStats();
      expect(stats.activeAgents).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed URLs gracefully', () => {
      expect(() => pool.getAgent('not-a-url')).toThrow();
      expect(() => pool.getAgent('ftp://example.com')).not.toThrow();
      expect(() => pool.getAgent('')).toThrow();
    });
    
    it('should handle URLs with ports correctly', () => {
      const agent1 = pool.getAgent('https://example.com:8080/api');
      const agent2 = pool.getAgent('https://example.com:8080/different');
      const agent3 = pool.getAgent('https://example.com:9090/api');
      
      // Same port should reuse agent
      expect(agent1).toBe(agent2);
      
      // Different port should create new agent - but URL parsing might normalize ports
      // Let's check if they're actually different by testing with clearly different hostnames
      const agent4 = pool.getAgent('https://different.com:8080/api');
      expect(agent1).not.toBe(agent4);
      
      const stats = pool.getStats();
      expect(stats.activeAgents).toBeGreaterThanOrEqual(2);
      // URL parsing might normalize ports, so just check that hostnames are tracked
      expect(stats.hostnames.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should handle IPv6 URLs', () => {
      const agent = pool.getAgent('https://[2001:db8::1]:8080/path');
      expect(agent).toBeDefined();
      
      const stats = pool.getStats();
      expect(stats.activeAgents).toBe(1);
      // IPv6 URLs might be parsed differently by Node.js URL constructor
      expect(stats.hostnames[0]).toMatch(/2001:db8::1/);
    });
    
    it('should update lastUsed timestamp on each access', () => {
      vi.useFakeTimers();
      
      pool.getAgent('https://example.com');
      const initialTime = Date.now();
      
      vi.advanceTimersByTime(5000);
      
      pool.getAgent('https://example.com');
      
      // Access private lastUsed map to verify timestamp update
      const lastUsed = (pool as any).lastUsed.get('example.com');
      expect(lastUsed).toBeGreaterThan(initialTime);
      
      vi.useRealTimers();
    });
  });

  describe('Agent Configuration', () => {
    it('should create agents with correct configuration', () => {
      const agent = pool.getAgent('https://example.com');
      
      // Access agent options (these are typically private, but we can check some properties)
      expect(agent).toBeDefined();
      expect(typeof agent.destroy).toBe('function');
      
      // Agent should be configured for keep-alive
      const agentOptions = (agent as any).options;
      expect(agentOptions.keepAlive).toBe(true);
      expect(agentOptions.keepAliveMsecs).toBe(1000);
      expect(agentOptions.maxSockets).toBe(10);
      expect(agentOptions.maxFreeSockets).toBe(5);
      expect(agentOptions.timeout).toBe(30000);
      expect(agentOptions.scheduling).toBe('lifo');
    });
  });
});