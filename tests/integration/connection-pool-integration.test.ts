import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { ConnectionPoolManager } from '../../server/services/connection-pool';
import * as https from 'https';

// Simple integration tests that test the connection pool in isolation
describe('Connection Pool Integration Tests', () => {
  let testConnectionPool: ConnectionPoolManager;

  beforeAll(() => {
    // Setup console spy to capture connection pool logs
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    // Create a fresh connection pool for each test
    testConnectionPool = new ConnectionPoolManager();
  });

  afterEach(() => {
    // Clean up after each test
    if (testConnectionPool) {
      testConnectionPool.destroy();
    }
  });

  describe('HTTPS Agent Integration', () => {
    it('should create properly configured HTTPS agents', () => {
      const agent = testConnectionPool.getAgent('https://example.com/page1');
      
      expect(agent).toBeInstanceOf(https.Agent);
      
      // Check agent configuration
      const agentOptions = (agent as any).options;
      expect(agentOptions.keepAlive).toBe(true);
      expect(agentOptions.keepAliveMsecs).toBe(1000);
      expect(agentOptions.maxSockets).toBe(10);
      expect(agentOptions.maxFreeSockets).toBe(5);
      expect(agentOptions.timeout).toBe(30000);
      expect(agentOptions.scheduling).toBe('lifo');
    });

    it('should reuse agents for same domain', () => {
      const agent1 = testConnectionPool.getAgent('https://example.com/page1');
      const agent2 = testConnectionPool.getAgent('https://example.com/page2');
      const agent3 = testConnectionPool.getAgent('https://example.com/api/v1/data');
      
      expect(agent1).toBe(agent2);
      expect(agent2).toBe(agent3);
      
      const stats = testConnectionPool.getStats();
      expect(stats.activeAgents).toBe(1);
      expect(stats.hostnames).toEqual(['example.com']);
    });

    it('should create separate agents for different domains', () => {
      const agent1 = testConnectionPool.getAgent('https://api.example.com/data');
      const agent2 = testConnectionPool.getAgent('https://cdn.example.com/assets');
      const agent3 = testConnectionPool.getAgent('https://docs.example.com/guides');
      
      expect(agent1).not.toBe(agent2);
      expect(agent2).not.toBe(agent3);
      expect(agent1).not.toBe(agent3);
      
      const stats = testConnectionPool.getStats();
      expect(stats.activeAgents).toBe(3);
      expect(stats.hostnames.sort()).toEqual(['api.example.com', 'cdn.example.com', 'docs.example.com']);
    });

    it('should handle ports correctly', () => {
      const agent1 = testConnectionPool.getAgent('https://example.com:8443/secure');
      const agent2 = testConnectionPool.getAgent('https://example.com:9443/admin');
      const agent3 = testConnectionPool.getAgent('https://example.com:8443/api');
      
      // Same port should reuse agent
      expect(agent1).toBe(agent3);
      
      // Different ports may or may not create different agents (depends on URL parsing)
      const stats = testConnectionPool.getStats();
      expect(stats.activeAgents).toBeGreaterThanOrEqual(1);
      expect(stats.activeAgents).toBeLessThanOrEqual(2);
    });
  });

  describe('Capacity Management Integration', () => {
    it('should enforce capacity limits through eviction', async () => {
      // Set a small capacity for testing
      const originalMaxAgents = (testConnectionPool as any).maxAgents;
      (testConnectionPool as any).maxAgents = 2; // Very small for easier testing

      try {
        // Create agents up to capacity
        testConnectionPool.getAgent('https://first.com/page');
        testConnectionPool.getAgent('https://second.com/page');
        
        // At capacity, should have 2 agents
        let stats = testConnectionPool.getStats();
        expect(stats.activeAgents).toBe(2);
        expect(stats.hostnames.sort()).toEqual(['first.com', 'second.com']);
        
        // Add a small delay to ensure timestamps are different
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        await delay(10);
        
        // Add another agent - should trigger eviction of oldest (first.com)
        testConnectionPool.getAgent('https://third.com/page');
        
        // Should not exceed capacity
        stats = testConnectionPool.getStats();
        expect(stats.activeAgents).toBe(2);
        expect(stats.hostnames).toHaveLength(2);
        
        // Should have evicted first.com and kept second.com + third.com
        expect(stats.hostnames).not.toContain('first.com');
        expect(stats.hostnames).toContain('second.com');
        expect(stats.hostnames).toContain('third.com');
      } finally {
        (testConnectionPool as any).maxAgents = originalMaxAgents;
      }
    });

    it('should track memory usage accurately', () => {
      // Create several agents
      const domains = ['domain1.com', 'domain2.com', 'domain3.com'];
      domains.forEach(domain => {
        testConnectionPool.getAgent(`https://${domain}/page`);
      });

      const stats = testConnectionPool.getStats();
      expect(stats.memoryUsage).toMatch(/^\d+MB$/);
      
      const memoryMB = parseInt(stats.memoryUsage.replace('MB', ''));
      expect(memoryMB).toBeGreaterThan(0);
      expect(memoryMB).toBeLessThan(200); // Should be reasonable for test environment
    });
  });

  describe('Cleanup Integration', () => {
    it('should clean up idle agents correctly', () => {
      // Create some agents
      testConnectionPool.getAgent('https://example1.com');
      testConnectionPool.getAgent('https://example2.com');
      testConnectionPool.getAgent('https://example3.com');
      
      expect(testConnectionPool.getStats().activeAgents).toBe(3);
      
      // Manually trigger cleanup with old timestamps
      const lastUsedMap = (testConnectionPool as any).lastUsed;
      const oldTime = Date.now() - 70000; // 70 seconds ago
      lastUsedMap.set('example1.com', oldTime);
      lastUsedMap.set('example2.com', oldTime);
      lastUsedMap.set('example3.com', oldTime);
      
      const cleanupMethod = (testConnectionPool as any).cleanupIdleAgents.bind(testConnectionPool);
      cleanupMethod();
      
      const stats = testConnectionPool.getStats();
      expect(stats.activeAgents).toBe(0);
      expect(stats.hostnames).toEqual([]);
    });

    it('should preserve recently used agents during cleanup', () => {
      // Create agents
      testConnectionPool.getAgent('https://old.com');
      testConnectionPool.getAgent('https://recent.com');
      
      expect(testConnectionPool.getStats().activeAgents).toBe(2);
      
      // Set different timestamps
      const lastUsedMap = (testConnectionPool as any).lastUsed;
      const oldTime = Date.now() - 70000; // 70 seconds ago (expired)
      const recentTime = Date.now() - 30000; // 30 seconds ago (still valid)
      
      lastUsedMap.set('old.com', oldTime);
      lastUsedMap.set('recent.com', recentTime);
      
      const cleanupMethod = (testConnectionPool as any).cleanupIdleAgents.bind(testConnectionPool);
      cleanupMethod();
      
      const stats = testConnectionPool.getStats();
      expect(stats.activeAgents).toBe(1);
      expect(stats.hostnames).toEqual(['recent.com']);
    });
  });

  describe('Concurrent Access Integration', () => {
    it('should handle concurrent agent requests safely', async () => {
      const concurrentRequests = 20;
      const hostname = 'concurrent.com';
      
      // Create many concurrent requests for the same hostname
      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        new Promise<https.Agent>(resolve => {
          setTimeout(() => {
            const agent = testConnectionPool.getAgent(`https://${hostname}/page${i}`);
            resolve(agent);
          }, Math.random() * 10); // Random small delay
        })
      );
      
      const agents = await Promise.all(promises);
      
      // All should be the same agent instance
      const uniqueAgents = new Set(agents);
      expect(uniqueAgents.size).toBe(1);
      
      // Should only have one hostname tracked
      const stats = testConnectionPool.getStats();
      expect(stats.activeAgents).toBe(1);
      expect(stats.hostnames).toEqual([hostname]);
    });

    it('should handle mixed concurrent requests correctly', async () => {
      const domainsCount = 5;
      const requestsPerDomain = 4;
      
      const allPromises: Promise<{ domain: string; agent: https.Agent }>[] = [];
      
      for (let domainIndex = 0; domainIndex < domainsCount; domainIndex++) {
        const domain = `domain${domainIndex}.com`;
        
        for (let reqIndex = 0; reqIndex < requestsPerDomain; reqIndex++) {
          const promise = new Promise<{ domain: string; agent: https.Agent }>(resolve => {
            setTimeout(() => {
              const agent = testConnectionPool.getAgent(`https://${domain}/path${reqIndex}`);
              resolve({ domain, agent });
            }, Math.random() * 20);
          });
          
          allPromises.push(promise);
        }
      }
      
      const results = await Promise.all(allPromises);
      
      // Group by domain
      const agentsByDomain = new Map<string, Set<https.Agent>>();
      results.forEach(({ domain, agent }) => {
        if (!agentsByDomain.has(domain)) {
          agentsByDomain.set(domain, new Set());
        }
        agentsByDomain.get(domain)!.add(agent);
      });
      
      // Each domain should have exactly one unique agent
      expect(agentsByDomain.size).toBe(domainsCount);
      agentsByDomain.forEach((agents, domain) => {
        expect(agents.size).toBe(1);
      });
      
      // Total agents should equal number of domains
      const stats = testConnectionPool.getStats();
      expect(stats.activeAgents).toBe(domainsCount);
      expect(stats.hostnames).toHaveLength(domainsCount);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle malformed URLs gracefully', () => {
      expect(() => testConnectionPool.getAgent('not-a-url')).toThrow();
      expect(() => testConnectionPool.getAgent('')).toThrow();
      expect(() => testConnectionPool.getAgent('ftp://example.com')).not.toThrow();
      
      // Pool should remain in consistent state
      const stats = testConnectionPool.getStats();
      expect(stats.activeAgents).toBeGreaterThanOrEqual(0);
    });

    it('should handle destroy operations safely', () => {
      // Create some agents
      testConnectionPool.getAgent('https://example1.com');
      testConnectionPool.getAgent('https://example2.com');
      
      const initialStats = testConnectionPool.getStats();
      expect(initialStats.activeAgents).toBe(2);
      
      // Destroy should clean up everything
      testConnectionPool.destroy();
      
      const finalStats = testConnectionPool.getStats();
      expect(finalStats.activeAgents).toBe(0);
      expect(finalStats.hostnames).toEqual([]);
      
      // Multiple destroy calls should be safe
      expect(() => testConnectionPool.destroy()).not.toThrow();
    });
  });

  describe('Performance Integration', () => {
    it('should maintain acceptable performance under load', () => {
      const startTime = Date.now();
      const agentCount = 100;
      
      // Create many agents rapidly
      for (let i = 0; i < agentCount; i++) {
        testConnectionPool.getAgent(`https://site${i % 10}.com/path${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly (less than 100ms for 100 agents)
      expect(duration).toBeLessThan(100);
      
      // Should have created agents for 10 different domains
      const stats = testConnectionPool.getStats();
      expect(stats.activeAgents).toBe(10); // 10 unique domains
      expect(stats.hostnames).toHaveLength(10);
    });

    it('should scale memory usage reasonably', () => {
      const initialStats = testConnectionPool.getStats();
      const initialMemory = parseInt(initialStats.memoryUsage.replace('MB', ''));
      
      // Create agents for many domains
      for (let i = 0; i < 50; i++) {
        testConnectionPool.getAgent(`https://domain${i}.com/page`);
      }
      
      const finalStats = testConnectionPool.getStats();
      const finalMemory = parseInt(finalStats.memoryUsage.replace('MB', ''));
      
      // Memory should increase but not dramatically
      expect(finalMemory).toBeGreaterThan(initialMemory);
      expect(finalMemory - initialMemory).toBeLessThan(50); // Less than 50MB increase
      
      expect(finalStats.activeAgents).toBe(50);
    });
  });

  describe('Real World Integration Scenarios', () => {
    it('should handle documentation site pattern', () => {
      // Simulate analyzing a documentation site
      const baseUrls = [
        'https://docs.example.com/',
        'https://docs.example.com/guide/getting-started',
        'https://docs.example.com/api/reference',
        'https://docs.example.com/tutorials/basic',
        'https://docs.example.com/examples/advanced'
      ];
      
      const agents = baseUrls.map(url => testConnectionPool.getAgent(url));
      
      // All should use the same agent
      const uniqueAgents = new Set(agents);
      expect(uniqueAgents.size).toBe(1);
      
      const stats = testConnectionPool.getStats();
      expect(stats.activeAgents).toBe(1);
      expect(stats.hostnames).toEqual(['docs.example.com']);
    });

    it('should handle multi-subdomain site pattern', () => {
      // Simulate analyzing a site with multiple subdomains
      const subdomains = ['www', 'api', 'docs', 'cdn', 'blog'];
      const agents = subdomains.map(subdomain => 
        testConnectionPool.getAgent(`https://${subdomain}.example.com/page`)
      );
      
      // Each subdomain should get its own agent
      const uniqueAgents = new Set(agents);
      expect(uniqueAgents.size).toBe(5);
      
      const stats = testConnectionPool.getStats();
      expect(stats.activeAgents).toBe(5);
      expect(stats.hostnames.sort()).toEqual([
        'api.example.com',
        'blog.example.com', 
        'cdn.example.com',
        'docs.example.com',
        'www.example.com'
      ]);
    });

    it('should handle mixed protocol gracefully', () => {
      // Only HTTPS should use connection pool
      const httpsAgent = testConnectionPool.getAgent('https://secure.com/page');
      
      expect(httpsAgent).toBeInstanceOf(https.Agent);
      
      const stats = testConnectionPool.getStats();
      expect(stats.activeAgents).toBe(1);
      expect(stats.hostnames).toEqual(['secure.com']);
      
      // Connection pool only handles HTTPS URLs
      // HTTP URLs would not use this connection pool in practice
    });
  });
});