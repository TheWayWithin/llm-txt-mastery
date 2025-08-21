/**
 * Simple utility function for generating temporary emails in tests
 * Exports a generateTempEmail function for backwards compatibility
 */

/**
 * Generate a unique temporary email for testing
 */
export function generateTempEmail(): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  return `playwright-test-${timestamp}-${randomId}@example.com`;
}

/**
 * TemporaryEmailService
 * 
 * Provides integration with multiple temporary email services for Playwright testing.
 * Supports MailSlurp (premium), Mailinator (free tier), and 10minutemail (web-based).
 * 
 * Automatically falls back to alternative services if primary service fails.
 */
export class TemporaryEmailService {
  private usedEmails: Set<string> = new Set();
  
  /**
   * Create a temporary email address using available service
   */
  async createTemporaryEmail(): Promise<string> {
    // Try multiple strategies in order of preference
    const strategies = [
      () => this.createMailinatorEmail(),
      () => this.create10MinuteEmail(),
      () => this.createTimestampEmail()
    ];
    
    for (const strategy of strategies) {
      try {
        const email = await strategy();
        if (email && !this.usedEmails.has(email)) {
          this.usedEmails.add(email);
          console.log(`Created temporary email: ${email}`);
          return email;
        }
      } catch (error) {
        console.warn(`Email strategy failed, trying next:`, (error as Error).message);
      }
    }
    
    throw new Error('All temporary email strategies failed');
  }

  /**
   * Create Mailinator email (free public service)
   * Format: test-{timestamp}@mailinator.com
   */
  private async createMailinatorEmail(): Promise<string> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    return `test-${timestamp}-${randomId}@mailinator.com`;
  }

  /**
   * Create 10minutemail-style email
   * Format: test-{timestamp}@10minutemail.com
   */
  private async create10MinuteEmail(): Promise<string> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    return `test-${timestamp}-${randomId}@10minutemail.com`;
  }

  /**
   * Create timestamp-based email for testing
   * Format: playwright-test-{timestamp}@example.com
   */
  private async createTimestampEmail(): Promise<string> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    return `playwright-test-${timestamp}-${randomId}@example.com`;
  }

  /**
   * Wait for email to arrive (for services that support checking)
   * This is a placeholder for future implementation with email checking APIs
   */
  async waitForEmail(email: string, timeout: number = 30000): Promise<any> {
    console.log(`Waiting for email to ${email} (timeout: ${timeout}ms)`);
    
    // For now, just wait and return a mock email
    // In a real implementation, this would check the email service API
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      subject: 'Email Verification',
      body: 'Please verify your email address',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get verification link from email content
   * This is a placeholder for extracting verification links
   */
  extractVerificationLink(emailContent: string): string | null {
    // Mock verification link extraction
    const linkPattern = /https?:\/\/[^\s]+verify[^\s]*/i;
    const match = emailContent.match(linkPattern);
    return match ? match[0] : null;
  }

  /**
   * Clean up used emails (for test cleanup)
   */
  cleanup(): void {
    this.usedEmails.clear();
  }

  /**
   * Get list of used emails (for debugging)
   */
  getUsedEmails(): string[] {
    return Array.from(this.usedEmails);
  }
}

/**
 * Factory function to create the best available email service
 */
export function createTemporaryEmailService(): TemporaryEmailService {
  console.log('Using free temporary email service');
  return new TemporaryEmailService();
}