import { test, expect } from '@playwright/test';

test.describe('ModernLogin Component Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login');

    // Wait for main sections to load
    await page.waitForSelector('[data-testid="modern-hero"]', { timeout: 5000 }).catch(() => {
      // Component might not have test id, wait for content instead
      return page.waitForSelector('h1, h2', { timeout: 5000 });
    });

    // Wait for animations to settle (2 seconds)
    await page.waitForTimeout(2000);
  });

  test('Full page hero and feature showcase', async ({ page }) => {
    // Take full page screenshot showing hero section
    await page.screenshot({
      path: 'screenshots/01-hero-section.png',
      fullPage: true,
    });

    console.log('✓ Hero section screenshot saved');
  });

  test('Feature showcase section', async ({ page }) => {
    // Scroll to features section
    await page.evaluate(() => {
      const features = document.querySelector('#features');
      features?.scrollIntoView({ behavior: 'smooth' });
    });

    await page.waitForTimeout(1500);

    // Screenshot the features area
    const featureSection = await page.locator('section#features, section:has-text("Fitur Powerful")');
    if (await featureSection.isVisible()) {
      await featureSection.screenshot({ path: 'screenshots/02-feature-showcase.png' });
      console.log('✓ Feature showcase screenshot saved');
    }
  });

  test('Login modal opened state', async ({ page }) => {
    // Click the floating "Masuk Sekarang" button
    await page.click('button:has-text("Masuk Sekarang")');

    // Wait for modal animation to complete
    await page.waitForTimeout(500);

    // Take screenshot of login modal
    await page.screenshot({
      path: 'screenshots/03-login-modal.png',
      fullPage: false,
    });

    console.log('✓ Login modal screenshot saved');
  });

  test('Mobile responsive view - hero section', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.waitForTimeout(1000);

    // Screenshot mobile hero
    await page.screenshot({
      path: 'screenshots/04-mobile-hero.png',
      fullPage: true,
    });

    console.log('✓ Mobile hero screenshot saved');
  });

  test('Mobile responsive view - login modal', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Click login button
    await page.click('button:has-text("Masuk Sekarang")');
    await page.waitForTimeout(500);

    // Screenshot modal on mobile
    await page.screenshot({
      path: 'screenshots/05-mobile-login-modal.png',
      fullPage: false,
    });

    console.log('✓ Mobile login modal screenshot saved');
  });

  test('Tablet responsive view', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.waitForTimeout(1000);

    // Screenshot tablet view
    await page.screenshot({
      path: 'screenshots/06-tablet-view.png',
      fullPage: true,
    });

    console.log('✓ Tablet view screenshot saved');
  });

  test('Navbar scroll effect', async ({ page }) => {
    // Scroll down to trigger navbar background
    await page.evaluate(() => {
      window.scrollY = 100;
      window.dispatchEvent(new Event('scroll'));
    });

    await page.waitForTimeout(1000);

    // Screenshot navbar with background
    const navbar = await page.locator('nav').first();
    if (await navbar.isVisible()) {
      await navbar.screenshot({ path: 'screenshots/07-navbar-scrolled.png' });
      console.log('✓ Navbar scroll effect screenshot saved');
    }
  });
});
