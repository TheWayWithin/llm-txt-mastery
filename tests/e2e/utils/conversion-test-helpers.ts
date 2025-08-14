import { Page } from '@playwright/test';

/**
 * ConversionTestHelper
 * 
 * Utility class for tracking conversion metrics and events during Playwright tests.
 * Provides methods to measure user journey performance and collect conversion data.
 */
export class ConversionTestHelper {
  private page: Page;
  private events: Array<{ event: string; timestamp: number; data?: any }> = [];
  
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Track a conversion event with timestamp
   */
  async trackEvent(eventName: string, data?: any): Promise<void> {
    const timestamp = Date.now();
    this.events.push({
      event: eventName,
      timestamp,
      data
    });
    
    console.log(`Event tracked: ${eventName}`, data ? data : '');
  }

  /**
   * Get all tracked events
   */
  getEvents(): Array<{ event: string; timestamp: number; data?: any }> {
    return [...this.events];
  }

  /**
   * Calculate time between two events
   */
  getTimeBetweenEvents(startEvent: string, endEvent: string): number | null {
    const start = this.events.find(e => e.event === startEvent);
    const end = this.events.find(e => e.event === endEvent);
    
    if (!start || !end) {
      return null;
    }
    
    return end.timestamp - start.timestamp;
  }

  /**
   * Reset tracked events (useful for multiple test runs)
   */
  reset(): void {
    this.events = [];
  }

  /**
   * Verify that Coffee tier is selected by default
   */
  async verifyCoffeeDefault(): Promise<boolean> {
    try {
      const coffeeRadio = this.page.locator('input[value="coffee"]');
      const isChecked = await coffeeRadio.isChecked();
      
      if (isChecked) {
        await this.trackEvent('coffee_tier_default_verified');
      } else {
        await this.trackEvent('coffee_tier_default_failed');
      }
      
      return isChecked;
    } catch (error) {
      await this.trackEvent('coffee_tier_verification_error', { error: error.message });
      return false;
    }
  }

  /**
   * Measure page load performance
   */
  async measurePageLoad(url: string): Promise<number> {
    const startTime = Date.now();
    
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    await this.trackEvent('page_load_measured', { url, loadTime });
    
    return loadTime;
  }

  /**
   * Check for visible error messages on page
   */
  async checkForErrors(): Promise<string[]> {
    const errorSelectors = [
      '.error',
      '.alert-error', 
      '[role="alert"]',
      '.text-red-500',
      '.text-red-600',
      '.text-red-700',
      '.bg-red-50',
      '.border-red-200'
    ];
    
    const errors: string[] = [];
    
    for (const selector of errorSelectors) {
      try {
        const elements = this.page.locator(selector);
        const count = await elements.count();
        
        if (count > 0) {
          for (let i = 0; i < count; i++) {
            const text = await elements.nth(i).textContent();
            if (text && text.trim()) {
              errors.push(text.trim());
            }
          }
        }
      } catch (error) {
        // Continue checking other selectors
      }
    }
    
    if (errors.length > 0) {
      await this.trackEvent('errors_detected', { errors });
    }
    
    return errors;
  }

  /**
   * Verify auth buttons are visible and properly labeled
   */
  async verifyAuthButtons(): Promise<{ signIn: boolean; signUp: boolean }> {
    try {
      const signInButton = this.page.getByRole('button', { name: 'Sign In' });
      const signUpButton = this.page.getByRole('button', { name: 'Sign Up' });
      
      const signInVisible = await signInButton.isVisible();
      const signUpVisible = await signUpButton.isVisible();
      
      await this.trackEvent('auth_buttons_verified', {
        signInVisible,
        signUpVisible
      });
      
      return {
        signIn: signInVisible,
        signUp: signUpVisible
      };
    } catch (error) {
      await this.trackEvent('auth_buttons_verification_error', { error: error.message });
      return { signIn: false, signUp: false };
    }
  }

  /**
   * Take screenshot with timestamp
   */
  async takeTimestampedScreenshot(name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-results/${name}-${timestamp}.png`;
    
    await this.page.screenshot({ 
      path: filename,
      fullPage: true 
    });
    
    await this.trackEvent('screenshot_taken', { filename });
    
    return filename;
  }

  /**
   * Measure conversion funnel drop-off
   */
  calculateConversionFunnel(): {
    landingViews: number;
    tierSelections: number;
    authAttempts: number;
    authCompletions: number;
    conversionRate: number;
  } {
    const landingViews = this.events.filter(e => e.event === 'landing_page_visit').length;
    const tierSelections = this.events.filter(e => e.event === 'tier_selected').length;
    const authAttempts = this.events.filter(e => 
      e.event === 'signup_button_clicked' || e.event === 'signin_button_clicked'
    ).length;
    const authCompletions = this.events.filter(e => 
      e.event === 'signup_completed' || e.event === 'signin_completed'
    ).length;
    
    const conversionRate = landingViews > 0 ? (authCompletions / landingViews) : 0;
    
    return {
      landingViews,
      tierSelections,
      authAttempts,
      authCompletions,
      conversionRate
    };
  }

  /**
   * Export events to JSON for analysis
   */
  exportEvents(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      events: this.events,
      funnel: this.calculateConversionFunnel()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Verify mobile responsiveness
   */
  async testMobileResponsiveness(): Promise<boolean> {
    try {
      await this.page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      // Check if key elements are still visible and accessible
      const coffeeRadio = this.page.locator('input[value="coffee"]');
      const signUpButton = this.page.getByRole('button', { name: 'Sign Up' });
      const signInButton = this.page.getByRole('button', { name: 'Sign In' });
      
      const coffeeVisible = await coffeeRadio.isVisible();
      const signUpVisible = await signUpButton.isVisible();
      const signInVisible = await signInButton.isVisible();
      
      const allVisible = coffeeVisible && signUpVisible && signInVisible;
      
      await this.trackEvent('mobile_responsiveness_tested', {
        coffeeVisible,
        signUpVisible,
        signInVisible,
        allVisible
      });
      
      return allVisible;
    } catch (error) {
      await this.trackEvent('mobile_responsiveness_error', { error: error.message });
      return false;
    }
  }

  /**
   * Test tier selection behavior
   */
  async testTierSelection(): Promise<{
    defaultTier: string | null;
    canSelectOtherTiers: boolean;
  }> {
    try {
      // Check default selection
      const tiers = ['starter', 'coffee', 'growth', 'scale'];
      let defaultTier: string | null = null;
      
      for (const tier of tiers) {
        const radio = this.page.locator(`input[value="${tier}"]`);
        if (await radio.isChecked()) {
          defaultTier = tier;
          break;
        }
      }
      
      // Test if other tiers can be selected
      let canSelectOtherTiers = false;
      try {
        const starterRadio = this.page.locator('input[value="starter"]');
        await starterRadio.click();
        canSelectOtherTiers = await starterRadio.isChecked();
        
        // Reset to coffee tier
        const coffeeRadio = this.page.locator('input[value="coffee"]');
        await coffeeRadio.click();
      } catch (error) {
        // If we can't click other tiers, that's fine for this test
      }
      
      await this.trackEvent('tier_selection_tested', {
        defaultTier,
        canSelectOtherTiers
      });
      
      return { defaultTier, canSelectOtherTiers };
    } catch (error) {
      await this.trackEvent('tier_selection_test_error', { error: error.message });
      return { defaultTier: null, canSelectOtherTiers: false };
    }
  }
}