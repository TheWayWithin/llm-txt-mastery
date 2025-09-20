/**
 * Keep-Alive Service
 * 
 * Prevents Railway container hibernation by pinging the /health endpoint every 4 hours.
 * This eliminates the 4-5 minute cold start delays that occur when containers
 * hibernate after 7+ days of inactivity.
 */

import fetch from 'node-fetch';

export class KeepAliveService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly pingInterval = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  private readonly healthEndpoint = '/health';
  private baseUrl: string;

  constructor() {
    // Determine base URL from environment
    this.baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : process.env.PORT 
        ? `http://localhost:${process.env.PORT}`
        : 'http://localhost:3000';
  }

  /**
   * Start the keep-alive service
   */
  public start(): void {
    if (this.intervalId) {
      console.log('⚡ Keep-alive service already running');
      return;
    }

    console.log(`⚡ Starting keep-alive service - pinging ${this.baseUrl}${this.healthEndpoint} every 4 hours`);
    
    // Ping immediately on start (after a short delay to ensure server is ready)
    setTimeout(() => {
      this.ping();
    }, 30000); // 30 seconds after start

    // Set up recurring pings
    this.intervalId = setInterval(() => {
      this.ping();
    }, this.pingInterval);
  }

  /**
   * Stop the keep-alive service
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⚡ Keep-alive service stopped');
    }
  }

  /**
   * Perform a health check ping
   */
  private async ping(): Promise<void> {
    try {
      const startTime = Date.now();
      const url = `${this.baseUrl}${this.healthEndpoint}`;
      
      console.log(`⚡ Keep-alive ping starting: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'Keep-Alive-Service/1.0'
        }
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        console.log(`✅ Keep-alive ping successful (${duration}ms): ${response.status}`);
      } else {
        console.warn(`⚠️ Keep-alive ping returned non-200 status (${duration}ms): ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Keep-alive ping failed:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Get service status
   */
  public getStatus(): { running: boolean; baseUrl: string; nextPing?: Date } {
    return {
      running: this.intervalId !== null,
      baseUrl: this.baseUrl,
      nextPing: this.intervalId ? new Date(Date.now() + this.pingInterval) : undefined
    };
  }
}

// Create singleton instance
export const keepAliveService = new KeepAliveService();

// Auto-start in production
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
  keepAliveService.start();
}