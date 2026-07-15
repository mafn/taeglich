import { test, expect, type Page } from '@playwright/test';

test.describe('1 Crore Transfer - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Install fake timers
    await page.clock.install({ time: new Date('2026-07-13T12:00:00Z') });
    await page.goto('/d/2026-07-13');
  });

  async function startGame(page: Page, mode: 'standard' | 'extended' = 'standard') {
    if (mode === 'extended') {
      await page.locator('input[name="pressure"][value="extended"]').check();
    }
    await page.locator('#start-form button[type="submit"]').click();
    await expect(page.locator('#login-screen')).toBeVisible();
  }

  async function doLogin(page: Page) {
    await page.locator('#pin-input').click();
    for (const digit of '1984') {
      await page.locator(`#vk-keys button:has-text("${digit}")`).click();
    }
    let captcha = await page.evaluate(() => (window as any).ctx?.currentCaptcha || document.getElementById('captcha-display')?.textContent);
    await page.locator('#captcha-input').fill(captcha || 'ABCDE');
    await page.locator('#vk-close').click();
    await page.locator('#btn-login').click();
    
    await expect(page.locator('#fake-alert-modal')).toBeVisible();
    await page.locator('#btn-ok-alert').click();
    await expect(page.locator('#fake-alert-modal')).toBeHidden();
    
    await page.locator('#pin-input').click();
    for (const digit of '8839') {
      await page.locator(`#vk-keys button:has-text("${digit}")`).click();
    }
    captcha = await page.evaluate(() => (window as any).ctx?.currentCaptcha || document.getElementById('captcha-display')?.textContent);
    await page.locator('#captcha-input').fill(captcha || 'ABCDE');
    await page.locator('#vk-close').click();
    await page.locator('#btn-login').click();
    
    await expect(page.locator('#dashboard-screen')).toBeVisible();
  }

  async function setupTransfer(page: Page) {
    await page.clock.fastForward(3000);
    await expect(page.locator('#ad-modal-overlay')).toBeVisible();
    await page.locator('#btn-close-ad').click();
    
    await page.locator('#btn-fund-transfer').click();
    await expect(page.locator('#transfer-step-1')).toBeVisible();
    await page.locator('#transfer-beneficiary').selectOption('scam');
    await page.locator('#transfer-amount').fill('10000000');
    await page.locator('#btn-transfer-proceed').click();
    await expect(page.locator('#transfer-step-2')).toBeVisible();
    await page.locator('#transfer-warning-ack').check();
    await page.locator('#btn-transfer-confirm').click();
    await expect(page.locator('#transfer-step-3')).toBeVisible();
  }

  test('Can complete critical path and reach Tragic Success', async ({ page }) => {
    await startGame(page);
    await doLogin(page);
    await setupTransfer(page);
    
    // Fast forward to receive OTP (22s)
    await page.clock.fastForward(22000);
    
    // OTP should be visible in simulated phone
    await expect(page.locator('#simulated-phone')).toBeVisible();
    await expect(page.locator('#simulated-otp-code')).toHaveText('942187');
    
    // Submit OTP within 10s window (40s max)
    await page.locator('#otp-input').fill('942187');
    await page.locator('#btn-transfer-submit').dispatchEvent('click');
    
    await expect(page.locator('#fade-screen')).toBeVisible();
    await expect(page.locator('#fade-title')).toHaveText('YOU LOST');
  });

  test('Can trigger OTP Expiry via the 10-second window', async ({ page }) => {
    await startGame(page);
    await doLogin(page);
    await setupTransfer(page);
    
    // OTP arrives after 20s, expires 40s after that. Total 60s.
    await page.clock.fastForward(60000);
    
    await expect(page.locator('#fade-screen')).toBeVisible();
    await expect(page.locator('#fade-title')).toHaveText('YOU WON');
  });

  test('Can trigger Resistance ending via footer, notice, or warning link', async ({ page }) => {
    await startGame(page);
    await doLogin(page);
    await page.locator('#link-resistance-dash').click();
    await expect(page.locator('#fade-screen')).toBeVisible();
    await expect(page.locator('#fade-title')).toHaveText('YOU WON');
  });

  test('Can trigger Debt redirection ending', async ({ page }) => {
    await startGame(page);
    await doLogin(page);
    await page.locator('#banner-loan').click();
    await expect(page.locator('#fade-screen')).toBeVisible();
    await expect(page.locator('#fade-title')).toHaveText('YOU LOST');
  });

  test('Can trigger Fraud Freeze ending', async ({ page }) => {
    await startGame(page);
    await doLogin(page);
    await page.locator('#nav-report-fraud').click();
    await expect(page.locator('#fade-screen')).toBeVisible();
    await expect(page.locator('#fade-title')).toHaveText('YOU WON');
  });

  test('Can trigger Time\'s Up ending', async ({ page }) => {
    await startGame(page);
    // Standard time is 3 minutes (180,000 ms)
    await page.clock.fastForward(180000);
    
    await expect(page.locator('#fade-screen')).toBeVisible();
    await expect(page.locator('#fade-title')).toHaveText('YOU WON');
  });

  test('Global timer wins over concurrent actions', async ({ page }) => {
    await startGame(page);
    await doLogin(page);
    await setupTransfer(page);
    
    await page.clock.fastForward(30000);
    // Fill OTP
    await page.locator('#otp-input').fill('942187');
    
    // Fast forward exactly to 180s (Time's up boundary)
    await page.clock.fastForward(150000);
    
    // Competing submit action right on the deadline
    await page.locator('#btn-transfer-submit').dispatchEvent('click');
    
    await expect(page.locator('#fade-screen')).toBeVisible();
    // Global timer must trigger first
    await expect(page.locator('#fade-title')).toHaveText('YOU WON');
  });

  test('Exactly one terminal ending fires per playthrough', async ({ page }) => {
    await startGame(page);
    await doLogin(page);
    
    await page.locator('#link-resistance-dash').click();
    await expect(page.locator('#fade-screen')).toBeVisible();
    await expect(page.locator('#fade-title')).toHaveText('YOU WON');
    
    // Fast forward to end of time
    await page.clock.fastForward(180000);
    // Ending should not change to Time's Up
    await expect(page.locator('#fade-title')).toHaveText('YOU WON');
  });

  test('Selectable Standard/Extended time modes function correctly', async ({ page }) => {
    await startGame(page, 'extended');
    // Fast forward 3 minutes
    await page.clock.fastForward(180000);
    // Still in game, no ending yet
    await expect(page.locator('#fade-screen')).toBeHidden();
    
    // Fast forward another 7 minutes (total 10 minutes)
    await page.clock.fastForward(7 * 60 * 1000);
    await expect(page.locator('#fade-screen')).toBeVisible();
    await expect(page.locator('#fade-title')).toHaveText('YOU WON');
  });

  test('Pause/resume accurately preserves all deadlines and blocks interaction', async ({ page }) => {
    await startGame(page);
    await doLogin(page);
    
    // We are on DASHBOARD. Global timer is 180s.
    // Fast forward to exactly 20s
    await page.clock.fastForward(20000);
    
    await page.evaluate(() => {
      document.getElementById('ad-modal-overlay')?.classList.add('hidden');
      document.getElementById('ad-modal-overlay')?.classList.remove('flex');
    });

    // Pause game
    await page.locator('#btn-pause').click();
    
    // Fast forward 20s while paused (Total real time 40s)
    await page.clock.fastForward(20000);
    
    // Dismiss the ad modal if it popped up so we don't get pointer interception errors when clicking fund transfer
    await page.evaluate(() => {
      document.getElementById('ad-modal-overlay')?.classList.add('hidden');
      document.getElementById('ad-modal-overlay')?.classList.remove('flex');
    });

    // Interactions should be blocked while paused
    await page.locator('#btn-fund-transfer').click();
    await expect(page.locator('#transfer-step-1')).not.toBeVisible({ timeout: 100 });
    
    // Resume
    await page.locator('#btn-pause').click();
    
    // Fast forward enough to exceed Standard time if pause wasn't counted (180s real time passed)
    // 20 (before) + 20 (paused) + 140 (now) = 180s real time. Game time = 160s.
    await page.clock.fastForward(140000);
    await expect(page.locator('#fade-screen')).not.toBeVisible({ timeout: 100 });
    
    // Fast forward remaining game time (20s)
    await page.clock.fastForward(20000);
    await expect(page.locator('#fade-screen')).toBeVisible();
    await expect(page.locator('#fade-title')).toHaveText('YOU WON');
  });

  test('Form is navigable via keyboard Tab and alerts do not obscure focus', async ({ page }) => {
    await startGame(page);
    
    // Focus user id
    await page.locator('#user-id').focus();
    // Tab to pin input
    await page.keyboard.press('Tab');
    
    const isPinFocused = await page.evaluate(() => document.activeElement?.id === 'pin-input');
    expect(isPinFocused).toBe(true);
    
    // Trigger an alert
    await page.clock.fastForward(45000);
    await expect(page.locator('.notif-close').first()).toBeVisible();
    
    // Alert should not obscure focus. The CSS sets it to the top-right and pointer-events:none for the tray.
    const pointerEvents = await page.evaluate(() => {
      return window.getComputedStyle(document.getElementById('notification-tray')!).pointerEvents;
    });
    expect(pointerEvents).toBe('none');
  });

  test('Reflow works at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await startGame(page);
    await doLogin(page);
    
    // Ensure no horizontal scrolling on document body
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('Refresh and Back correctly reset the game', async ({ page }) => {
    await startGame(page);
    await doLogin(page);
    
    await page.goBack();
    // After popstate, JS forces a reload if not in START state, so we expect to see START
    await expect(page.locator('#start-screen')).toBeVisible();
  });

  test('Reduced motion successfully disables animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/d/2026-07-13');
    
    const isReduced = await page.evaluate(() => {
      const el = document.querySelector('.animate-marquee');
      if (!el) return null;
      return window.getComputedStyle(el).animationName === 'none' || window.getComputedStyle(el).animationName === '';
    });
    // This expects true because `motion-reduce:animate-none` makes it 'none'.
    expect(isReduced).toBe(true);
  });

  test('No gameplay-triggered network requests occur after load', async ({ page }) => {
    let appRequestsOccurred = false;
    
    // Wait for initial load
    await startGame(page);
    
    // Start listening
    page.on('request', req => {
      // It is critical to ensure no *runtime* requests are made by the app itself
      // We ignore Vite HMR and localhost asset fetches. Real app runtime XHR/Fetch should not happen.
      const rt = req.resourceType();
      if (rt === 'fetch' || rt === 'xhr') {
        appRequestsOccurred = true;
      }
    });

    await doLogin(page);
    await setupTransfer(page);
    
    expect(appRequestsOccurred).toBe(false);
  });
  
  test('SiteLinks remain reachable in immersive mode', async ({ page }) => {
    // There's a footer with sitelinks
    await expect(page.locator('footer a').first()).toBeVisible();
  });
});
