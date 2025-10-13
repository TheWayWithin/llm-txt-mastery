// Scroll to pricing preview section
const pricingSection = await page.locator('text=Simple, Transparent Pricing').first();
await pricingSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(1000);
