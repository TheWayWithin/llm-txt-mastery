import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Models for LLM.txt Mastery Application
 *
 * Provides maintainable, reusable page interaction patterns for Playwright tests.
 * Follows the Page Object Model pattern for better test structure and maintenance.
 */

/**
 * Base Page Object with common functionality
 */
export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateTo(url: string): Promise<void> {
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-results/${name}-${timestamp}.png`;
    await this.page.screenshot({ path: filename, fullPage: true });
    return filename;
  }

  async waitForElement(selector: string, timeout: number = 5000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ timeout });
    return element;
  }

  async isElementVisible(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).isVisible();
    } catch {
      return false;
    }
  }
}

/**
 * Landing Page Object
 * Handles interactions with the main landing page
 */
export class LandingPage extends BasePage {
  // Locators
  get coffeeRadio(): Locator {
    return this.page.locator('input[value="coffee"]');
  }

  get starterRadio(): Locator {
    return this.page.locator('input[value="starter"]');
  }

  get growthRadio(): Locator {
    return this.page.locator('input[value="growth"]');
  }

  get scaleRadio(): Locator {
    return this.page.locator('input[value="scale"]');
  }

  get signUpButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign Up' });
  }

  get signInButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign In' });
  }

  get coffeeContainer(): Locator {
    return this.page.locator('.border-orange-400, .bg-orange-50').first();
  }

  get mostPopularBadge(): Locator {
    return this.page.getByText('MOST POPULAR');
  }

  get tierSelectionGrid(): Locator {
    return this.page.locator('.grid.grid-cols-1.md\\:grid-cols-2');
  }

  // Actions
  async navigateToLanding(): Promise<void> {
    await this.navigateTo('/');
  }

  async selectTier(tier: 'starter' | 'coffee' | 'growth' | 'scale'): Promise<void> {
    const tierRadio = this.page.locator(`input[value="${tier}"]`);
    await tierRadio.click();
  }

  async clickSignUp(): Promise<void> {
    await this.signUpButton.click();
  }

  async clickSignIn(): Promise<void> {
    await this.signInButton.click();
  }

  async getSelectedTier(): Promise<string | null> {
    const tiers = ['starter', 'coffee', 'growth', 'scale'];

    for (const tier of tiers) {
      const radio = this.page.locator(`input[value="${tier}"]`);
      if (await radio.isChecked()) {
        return tier;
      }
    }

    return null;
  }

  // Validations
  async verifyCoffeeIsDefault(): Promise<void> {
    await expect(this.coffeeRadio).toBeChecked();
    await expect(this.coffeeContainer).toBeVisible();
    await expect(this.mostPopularBadge).toBeVisible();
  }

  async verifyAuthButtonsVisible(): Promise<void> {
    await expect(this.signUpButton).toBeVisible();
    await expect(this.signInButton).toBeVisible();
  }

  async verifyTierSelectionVisible(): Promise<void> {
    await expect(this.tierSelectionGrid).toBeVisible();
    await expect(this.coffeeRadio).toBeVisible();
    await expect(this.starterRadio).toBeVisible();
    await expect(this.growthRadio).toBeVisible();
    await expect(this.scaleRadio).toBeVisible();
  }
}

/**
 * Signup Page Object
 * Handles user registration flow
 */
export class SignupPage extends BasePage {
  // Locators
  get emailInput(): Locator {
    return this.page.locator('input[type="email"]');
  }

  get passwordInput(): Locator {
    return this.page.locator('input[type="password"]');
  }

  get confirmPasswordInput(): Locator {
    return this.page.locator('input[name="confirmPassword"], input[name="confirm-password"]');
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|create account|get started/i });
  }

  get errorMessages(): Locator {
    return this.page.locator('.error-message, .auth-error, [role="alert"]');
  }

  // Actions
  async navigateToSignup(tier?: string, website?: string): Promise<void> {
    let url = '/signup';
    const params = new URLSearchParams();

    if (tier) params.append('tier', tier);
    if (website) params.append('website', website);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    await this.navigateTo(url);
  }

  async fillForm(email: string, password: string): Promise<void> {
    await expect(this.emailInput).toBeVisible();

    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    // Fill confirm password if present
    if (await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(password);
    }
  }

  async submitForm(): Promise<void> {
    await expect(this.submitButton).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
  }

  async signup(email: string, password: string): Promise<void> {
    await this.fillForm(email, password);
    await this.submitForm();
  }

  // Validations
  async verifyOnSignupPage(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async getErrors(): Promise<string[]> {
    const elements = await this.errorMessages.all();
    const errors: string[] = [];

    for (const element of elements) {
      const text = await element.textContent();
      if (text?.trim()) {
        errors.push(text.trim());
      }
    }

    return errors;
  }
}

/**
 * Login Page Object
 * Handles user authentication flow
 */
export class LoginPage extends BasePage {
  // Locators
  get emailInput(): Locator {
    return this.page.locator('input[type="email"]');
  }

  get passwordInput(): Locator {
    return this.page.locator('input[type="password"]');
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: /sign in|login|continue/i });
  }

  get errorMessages(): Locator {
    return this.page.locator('.error-message, .auth-error, [role="alert"]');
  }

  get forgotPasswordLink(): Locator {
    return this.page.getByRole('link', { name: /forgot password/i });
  }

  // Actions
  async navigateToLogin(tier?: string, website?: string): Promise<void> {
    let url = '/login';
    const params = new URLSearchParams();

    if (tier) params.append('tier', tier);
    if (website) params.append('website', website);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    await this.navigateTo(url);
  }

  async fillForm(email: string, password: string): Promise<void> {
    await expect(this.emailInput).toBeVisible();

    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submitForm(): Promise<void> {
    await expect(this.submitButton).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillForm(email, password);
    await this.submitForm();
  }

  // Validations
  async verifyOnLoginPage(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async getErrors(): Promise<string[]> {
    const elements = await this.errorMessages.all();
    const errors: string[] = [];

    for (const element of elements) {
      const text = await element.textContent();
      if (text?.trim()) {
        errors.push(text.trim());
      }
    }

    return errors;
  }
}

/**
 * Analyze Page Object
 * Handles the main analysis interface
 */
export class AnalyzePage extends BasePage {
  // Locators
  get urlInput(): Locator {
    return this.page.locator(
      'input[type="url"], input[placeholder*="website"], input[placeholder*="URL"]'
    );
  }

  get analyzeButton(): Locator {
    return this.page.getByRole('button', { name: /analyze|start/i });
  }

  get userMenu(): Locator {
    return this.page.locator('.user-menu, [data-testid="user-menu"]');
  }

  get tierBadge(): Locator {
    return this.page.locator('.tier-badge, [data-testid="tier-badge"]');
  }

  get creditsDisplay(): Locator {
    return this.page.locator('.credits, [data-testid="credits"]');
  }

  get emailCaptureForm(): Locator {
    return this.page.getByText('Choose Your Analysis Type');
  }

  get analyzeAnotherButton(): Locator {
    return this.page.getByRole('button', { name: /analyze another website/i });
  }

  // Actions
  async navigateToAnalyze(): Promise<void> {
    await this.navigateTo('/analyze');
  }

  async startAnalysis(url: string): Promise<void> {
    await expect(this.urlInput).toBeVisible();
    await this.urlInput.fill(url);
    await this.analyzeButton.click();
  }

  async getUserTier(): Promise<string | null> {
    try {
      const tierElement = this.tierBadge;
      if (await tierElement.isVisible()) {
        const text = await tierElement.textContent();
        return text?.toLowerCase().trim() || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getUserCredits(): Promise<number | null> {
    try {
      const creditsElement = this.creditsDisplay;
      if (await creditsElement.isVisible()) {
        const text = await creditsElement.textContent();
        const match = text?.match(/(\d+)/);
        return match ? parseInt(match[1]) : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Validations
  async verifyOnAnalyzePage(): Promise<void> {
    await expect(this.page).toHaveURL('/analyze');
    await expect(this.urlInput).toBeVisible();
  }

  async verifyUserAuthenticated(): Promise<void> {
    await expect(this.userMenu).toBeVisible();
    await expect(this.emailCaptureForm).not.toBeVisible();
  }

  async verifyCleanInterface(): Promise<void> {
    // Ensure no landing page content is visible
    await expect(this.emailCaptureForm).not.toBeVisible();
    await expect(this.page.getByText('Choose Your Analysis Type')).not.toBeVisible();
  }

  async verifyCoffeeTier(): Promise<void> {
    await expect(this.tierBadge).toContainText('Coffee');
  }
}

/**
 * Dashboard Page Object
 * Handles user dashboard functionality
 */
export class DashboardPage extends BasePage {
  // Locators
  get analysisHistory(): Locator {
    return this.page.locator('[data-testid="analysis-history"]');
  }

  get userStats(): Locator {
    return this.page.locator('[data-testid="user-stats"]');
  }

  get tierInfo(): Locator {
    return this.page.locator('[data-testid="tier-info"]');
  }

  get logoutButton(): Locator {
    return this.page.getByRole('button', { name: /logout|sign out/i });
  }

  // Actions
  async navigateToDashboard(): Promise<void> {
    await this.navigateTo('/dashboard');
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }

  // Validations
  async verifyOnDashboard(): Promise<void> {
    await expect(this.page).toHaveURL('/dashboard');
  }

  async verifyUserDataVisible(): Promise<void> {
    // At least one of these should be visible for authenticated users
    const hasAnyUserData = await Promise.all([
      this.isElementVisible('[data-testid="analysis-history"]'),
      this.isElementVisible('[data-testid="user-stats"]'),
      this.isElementVisible('[data-testid="tier-info"]'),
      this.isElementVisible('.tier-badge'),
      this.isElementVisible('.user-menu'),
    ]);

    const hasData = hasAnyUserData.some(Boolean);
    expect(hasData).toBe(true);
  }
}

/**
 * Page Factory for creating page objects
 */
export class PageFactory {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  getLandingPage(): LandingPage {
    return new LandingPage(this.page);
  }

  getSignupPage(): SignupPage {
    return new SignupPage(this.page);
  }

  getLoginPage(): LoginPage {
    return new LoginPage(this.page);
  }

  getAnalyzePage(): AnalyzePage {
    return new AnalyzePage(this.page);
  }

  getDashboardPage(): DashboardPage {
    return new DashboardPage(this.page);
  }
}

/**
 * Application Navigator - High-level user journey orchestration
 */
export class AppNavigator {
  private pageFactory: PageFactory;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.pageFactory = new PageFactory(page);
  }

  /**
   * Complete signup flow from landing page
   */
  async completeSignupFlow(
    email: string,
    password: string,
    tier: string = 'coffee'
  ): Promise<void> {
    const landingPage = this.pageFactory.getLandingPage();
    const signupPage = this.pageFactory.getSignupPage();
    const analyzePage = this.pageFactory.getAnalyzePage();

    // Start from landing page
    await landingPage.navigateToLanding();
    await landingPage.verifyCoffeeIsDefault();
    await landingPage.clickSignUp();

    // Complete signup
    await signupPage.verifyOnSignupPage();
    await signupPage.signup(email, password);

    // Verify redirect to analyze page
    await analyzePage.verifyOnAnalyzePage();
    await analyzePage.verifyUserAuthenticated();
  }

  /**
   * Complete login flow from landing page
   */
  async completeLoginFlow(email: string, password: string, tier: string = 'coffee'): Promise<void> {
    const landingPage = this.pageFactory.getLandingPage();
    const loginPage = this.pageFactory.getLoginPage();
    const analyzePage = this.pageFactory.getAnalyzePage();

    // Start from landing page
    await landingPage.navigateToLanding();
    await landingPage.verifyCoffeeIsDefault();
    await landingPage.clickSignIn();

    // Complete login
    await loginPage.verifyOnLoginPage();
    await loginPage.login(email, password);

    // Verify redirect to analyze page
    await analyzePage.verifyOnAnalyzePage();
    await analyzePage.verifyUserAuthenticated();
  }

  /**
   * Validate conversion funnel metrics
   */
  async validateConversionFunnel(): Promise<{
    coffeeDefault: boolean;
    authButtonsVisible: boolean;
    noFrictionPoints: boolean;
  }> {
    const landingPage = this.pageFactory.getLandingPage();

    await landingPage.navigateToLanding();

    const coffeeDefault = await landingPage.coffeeRadio.isChecked();
    const signUpVisible = await landingPage.signUpButton.isVisible();
    const signInVisible = await landingPage.signInButton.isVisible();

    return {
      coffeeDefault,
      authButtonsVisible: signUpVisible && signInVisible,
      noFrictionPoints: coffeeDefault && signUpVisible && signInVisible,
    };
  }

  /**
   * Get current page factory for direct access
   */
  getPageFactory(): PageFactory {
    return this.pageFactory;
  }
}
