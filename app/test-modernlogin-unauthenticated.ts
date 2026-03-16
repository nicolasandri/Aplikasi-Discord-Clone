import { test, expect } from '@playwright/test';

test.describe('ModernLogin - Unauthenticated User', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear all cookies and localStorage to simulate unauthenticated session
    await context.clearCookies();

    // Navigate to login page
    await page.goto('http://localhost:5173/login');

    // Clear localStorage after navigation
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Navigate again to login page (now truly unauthenticated)
    await page.goto('http://localhost:5173/login');

    // Wait for main sections to load
    await page.waitForSelector('h1, h2, nav', { timeout: 5000 });

    // Wait for animations to settle
    await page.waitForTimeout(2000);
  });

  test('Full page hero and features', async ({ page }) => {
    // Take full page screenshot showing hero section
    await page.screenshot({
      path: 'screenshots/hero-full-page.png',
      fullPage: true,
    });

    console.log('✓ Hero full page screenshot saved');
  });

  test('Hero section only', async ({ page }) => {
    // Get hero/navbar area
    const viewport = await page.viewportSize();
    await page.screenshot({
      path: 'screenshots/hero-section-only.png',
      clip: {
        x: 0,
        y: 0,
        width: viewport?.width || 1280,
        height: viewport?.height || 720,
      },
    });

    console.log('✓ Hero section only screenshot saved');
  });

  test('Feature showcase section', async ({ page }) => {
    // Scroll to features section
    await page.evaluate(() => {
      const features = document.querySelector('#features');
      if (features) {
        features.scrollIntoView({ behavior: 'smooth' });
      }
    });

    await page.waitForTimeout(1500);

    // Take screenshot of visible area
    const viewport = await page.viewportSize();
    await page.screenshot({
      path: 'screenshots/features-section.png',
      clip: {
        x: 0,
        y: 0,
        width: viewport?.width || 1280,
        height: viewport?.height || 720,
      },
    });

    console.log('✓ Features section screenshot saved');
  });

  test('Click login button and show modal', async ({ page }) => {
    // Find and click the floating "Masuk Sekarang" button
    const loginButton = page.locator('button').filter({ hasText: 'Masuk Sekarang' }).last();

    // Wait for button to be visible
    await loginButton.waitFor({ state: 'visible', timeout: 5000 });

    // Click the button
    await loginButton.click();

    // Wait for modal animation
    await page.waitForTimeout(800);

    // Take screenshot of modal
    const viewport = await page.viewportSize();
    await page.screenshot({
      path: 'screenshots/login-modal-open.png',
      fullPage: false,
    });

    console.log('✓ Login modal screenshot saved');
  });

  test('Mobile view - hero section', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.waitForTimeout(800);

    // Screenshot mobile hero
    await page.screenshot({
      path: 'screenshots/mobile-hero-section.png',
      fullPage: true,
    });

    console.log('✓ Mobile hero screenshot saved');
  });

  test('Desktop view with scrolled navbar', async ({ page }) => {
    // Scroll down to show navbar with background
    await page.evaluate(() => {
      window.scrollBy(0, 200);
    });

    await page.waitForTimeout(800);

    // Screenshot with scrolled navbar
    await page.screenshot({
      path: 'screenshots/navbar-scrolled.png',
      fullPage: false,
    });

    console.log('✓ Navbar scrolled screenshot saved');
  });
});
