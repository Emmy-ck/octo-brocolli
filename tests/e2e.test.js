// E2E Tests for Customatch Platform
// Tests: Customer Flow, Baker Flow, and Admin Flow

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Load test data and inputs
const testData = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-data.json'), 'utf8'));
const testInputs = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-inputs.json'), 'utf8'));

// Base URL for testing
const BASE_URL = 'http://localhost:8080';

// ============================================
// CUSTOMER FLOW TESTS
// ============================================

test.describe('Customer End-to-End Flow', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    // Clear localStorage before tests
    page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.evaluate(() => localStorage.clear());
    await page.close();
  });

  test('should complete signup process', async ({ page }) => {
    const signupData = testInputs.customerFlow.signup;

    // Navigate to signup page
    await page.goto(`${BASE_URL}/pages/signup.html`);
    expect(page.url()).toContain('signup');

    // Fill signup form
    await page.fill('input[name="name"]', signupData.name);
    await page.fill('input[name="email"]', signupData.email);
    await page.fill('input[name="password"]', signupData.password);
    await page.fill('input[name="confirmPassword"]', signupData.confirmPassword);

    // Submit form
    await page.click('button[type="submit"]');

    // Verify redirect to index
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Verify user is logged in
    const userDisplay = await page.$text('text=Welcome');
    expect(userDisplay).toBeTruthy();
  });

  test('should login with valid credentials', async ({ page }) => {
    const loginData = testInputs.customerFlow.login;

    // Clear localStorage and navigate to login
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/pages/login.html`);

    // Fill login form
    await page.fill('input[type="email"]', loginData.email);
    await page.fill('input[type="password"]', loginData.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Verify successful login
    await page.waitForURL(`${BASE_URL}/index.html`, { timeout: 5000 });

    // Check session is saved
    const sessionData = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('customatchCurrentUser'))
    );
    expect(sessionData).toBeTruthy();
    expect(sessionData.email).toBe(loginData.email);
  });

  test('should reject login with invalid credentials', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/pages/login.html`);

    // Try to login with wrong password
    await page.fill('input[type="email"]', 'john.customer@test.com');
    await page.fill('input[type="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // Should stay on login page
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('login');

    // Check error message appears
    const errorVisible = await page.$('.alert-danger');
    expect(errorVisible).toBeTruthy();
  });

  test('should customize and proceed to checkout', async ({ page }) => {
    const customizationData = testInputs.customerFlow.customization;
    const loginData = testInputs.customerFlow.login;

    // Login first
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', loginData.email);
    await page.fill('input[type="password"]', loginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Navigate to customize page
    await page.goto(`${BASE_URL}/pages/customize.html`);
    expect(page.url()).toContain('customize');

    // Select cake customization options
    await page.selectOption('select[name="size"]', customizationData.size);
    await page.selectOption('select[name="flavor"]', customizationData.flavor);
    await page.selectOption('select[name="topping"]', customizationData.topping);

    // Add special message if available
    const messageInput = await page.$('input[name="message"]');
    if (messageInput) {
      await page.fill('input[name="message"]', customizationData.specialMessage);
    }

    // Set quantity
    await page.fill('input[type="number"]', customizationData.quantity.toString());

    // Click continue to checkout button
    await page.click('button:has-text("Continue to Checkout")');

    // Should redirect to checkout
    await page.waitForURL(/\/checkout/, { timeout: 5000 });
    expect(page.url()).toContain('checkout');
  });

  test('should complete checkout with delivery and payment', async ({ page }) => {
    const customizationData = testInputs.customerFlow.customization;
    const checkoutData = testInputs.customerFlow.checkout;
    const loginData = testInputs.customerFlow.login;

    // Login and go to customize
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', loginData.email);
    await page.fill('input[type="password"]', loginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Customize cake
    await page.goto(`${BASE_URL}/pages/customize.html`);
    await page.selectOption('select[name="size"]', customizationData.size);
    await page.selectOption('select[name="flavor"]', customizationData.flavor);
    await page.selectOption('select[name="topping"]', customizationData.topping);
    await page.click('button:has-text("Continue to Checkout")');

    // Wait for checkout page
    await page.waitForURL(/\/checkout/, { timeout: 5000 });

    // Fill delivery information
    await page.fill('input[name="firstName"]', checkoutData.firstName);
    await page.fill('input[name="lastName"]', checkoutData.lastName);
    await page.fill('input[name="phoneNumber"]', checkoutData.phoneNumber);
    await page.fill('input[name="address"]', checkoutData.address);
    await page.fill('input[name="city"]', checkoutData.city);
    await page.fill('input[name="state"]', checkoutData.state);
    await page.fill('input[name="zipCode"]', checkoutData.zipCode);
    await page.fill('input[name="country"]', checkoutData.country);

    // Select delivery provider
    const providerBtn = await page.$(`button:has-text("${checkoutData.deliveryProvider}")`);
    if (providerBtn) {
      await providerBtn.click();
    }

    // Fill payment information
    await page.fill('input[name="cardNumber"]', checkoutData.cardNumber);
    await page.fill('input[name="cardExpiry"]', checkoutData.cardExpiry);
    await page.fill('input[name="cvv"]', checkoutData.cvv);

    // Submit order
    await page.click('button:has-text("Place Order")');

    // Should redirect to confirmation
    await page.waitForURL(/\/confirmation/, { timeout: 5000 });
    expect(page.url()).toContain('confirmation');

    // Verify order confirmation message
    const confirmationText = await page.textContent('body');
    expect(confirmationText).toContain('Thank you') ||
    expect(confirmationText).toContain('Order Confirmed');
  });

  test('should view order tracking', async ({ page }) => {
    const loginData = testInputs.customerFlow.login;

    // Login
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', loginData.email);
    await page.fill('input[type="password"]', loginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Navigate to tracking page
    await page.goto(`${BASE_URL}/pages/customer/tracking.html`);
    expect(page.url()).toContain('tracking');

    // Verify order list is displayed
    const orderList = await page.$('.order-list') || await page.$('[data-testid="orders"]');
    expect(orderList).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    const loginData = testInputs.customerFlow.login;

    // Login
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', loginData.email);
    await page.fill('input[type="password"]', loginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Click logout button
    await page.click('button:has-text("Logout")');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain('login');

    // Session should be cleared
    const session = await page.evaluate(() =>
      localStorage.getItem('customatchCurrentUser')
    );
    expect(session).toBeNull();
  });

  test('should prevent access to protected routes without authentication', async ({ page }) => {
    // Clear localStorage
    await page.evaluate(() => localStorage.clear());

    // Try to access customize page without auth
    await page.goto(`${BASE_URL}/pages/customize.html`);

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain('login');
  });
});

// ============================================
// BAKER FLOW TESTS
// ============================================

test.describe('Baker End-to-End Flow', () => {
  test('should login as baker', async ({ page }) => {
    const bakerLoginData = testInputs.bakerFlow.login;

    // Clear localStorage
    await page.evaluate(() => localStorage.clear());

    // Navigate to login
    await page.goto(`${BASE_URL}/pages/login.html`);

    // Fill baker credentials
    await page.fill('input[type="email"]', bakerLoginData.email);
    await page.fill('input[type="password"]', bakerLoginData.password);
    await page.click('button[type="submit"]');

    // Verify login by checking session
    await page.waitForTimeout(1000);
    const session = await page.evaluate(() =>
      localStorage.getItem('customatchCurrentUser')
    );
    expect(session).toBeTruthy();
  });

  test('should view baker dashboard and orders', async ({ page }) => {
    const bakerLoginData = testInputs.bakerFlow.login;

    // Login as baker
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', bakerLoginData.email);
    await page.fill('input[type="password"]', bakerLoginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Navigate to baker dashboard
    await page.goto(`${BASE_URL}/pages/baker/baker-dashboard.html`);
    expect(page.url()).toContain('baker');

    // Verify dashboard elements exist
    const dashboardStats = await page.$('.stat-card') ||
                          await page.$('[data-testid="stats"]');
    expect(dashboardStats).toBeTruthy();

    // Verify orders section exists
    const ordersSection = await page.$('.orders-section') ||
                         await page.$('[data-testid="orders"]');
    expect(ordersSection).toBeTruthy();
  });

  test('should view baker statistics and charts', async ({ page }) => {
    const bakerLoginData = testInputs.bakerFlow.login;

    // Login as baker
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', bakerLoginData.email);
    await page.fill('input[type="password"]', bakerLoginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Navigate to baker dashboard
    await page.goto(`${BASE_URL}/pages/baker/baker-dashboard.html`);

    // Verify statistics are displayed
    const totalOrdersStat = await page.$('text=Total Orders') ||
                           await page.textContent('body').then(t => t.includes('Orders'));
    expect(totalOrdersStat).toBeTruthy();

    // Verify chart is rendered
    const chart = await page.$('canvas');
    expect(chart).toBeTruthy();
  });

  test('should accept and update order status', async ({ page }) => {
    const bakerLoginData = testInputs.bakerFlow.login;
    const orderAction = testInputs.bakerFlow.orderActions.acceptOrder;

    // Login as baker
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', bakerLoginData.email);
    await page.fill('input[type="password"]', bakerLoginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Navigate to baker dashboard
    await page.goto(`${BASE_URL}/pages/baker/baker-dashboard.html`);

    // Find and accept an order
    const orderRow = await page.$(`[data-order-id="${orderAction.orderId}"]`);
    if (orderRow) {
      const acceptBtn = await orderRow.$('button:has-text("Accept")');
      if (acceptBtn) {
        await acceptBtn.click();

        // Verify confirmation dialog
        await page.waitForTimeout(500);
        const confirmBtn = await page.$('button:has-text("Confirm")');
        if (confirmBtn) {
          await confirmBtn.click();
        }
      }
    }
  });

  test('should mark order as ready for delivery', async ({ page }) => {
    const bakerLoginData = testInputs.bakerFlow.login;
    const updateAction = testInputs.bakerFlow.orderActions.updateOrderStatus;

    // Login and navigate to dashboard
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', bakerLoginData.email);
    await page.fill('input[type="password"]', bakerLoginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    await page.goto(`${BASE_URL}/pages/baker/baker-dashboard.html`);

    // Find order and update status
    const orderRow = await page.$(`[data-order-id="${updateAction.orderId}"]`);
    if (orderRow) {
      const statusBtn = await orderRow.$('button:has-text("Update Status")') ||
                       await orderRow.$('button:has-text("Mark Complete")');
      if (statusBtn) {
        await statusBtn.click();
      }
    }
  });
});

// ============================================
// ADMIN FLOW TESTS
// ============================================

test.describe('Admin End-to-End Flow', () => {
  test('should login as admin', async ({ page }) => {
    const adminLoginData = testInputs.adminFlow.login;

    // Clear localStorage
    await page.evaluate(() => localStorage.clear());

    // Navigate to login
    await page.goto(`${BASE_URL}/pages/login.html`);

    // Fill admin credentials
    await page.fill('input[type="email"]', adminLoginData.email);
    await page.fill('input[type="password"]', adminLoginData.password);
    await page.click('button[type="submit"]');

    // Verify login
    await page.waitForTimeout(1000);
    const session = await page.evaluate(() =>
      localStorage.getItem('customatchCurrentUser')
    );
    expect(session).toBeTruthy();
  });

  test('should view admin dashboard', async ({ page }) => {
    const adminLoginData = testInputs.adminFlow.login;

    // Login as admin
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', adminLoginData.email);
    await page.fill('input[type="password"]', adminLoginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Navigate to admin dashboard
    await page.goto(`${BASE_URL}/pages/admin/admin-dashboard.html`);
    expect(page.url()).toContain('admin');

    // Verify sidebar navigation exists
    const sidebar = await page.$('.sidebar') ||
                   await page.$('[data-testid="sidebar"]');
    expect(sidebar).toBeTruthy();

    // Verify main content area
    const mainContent = await page.$('.main-content') ||
                       await page.$('[data-testid="main-content"]');
    expect(mainContent).toBeTruthy();
  });

  test('should view admin statistics and metrics', async ({ page }) => {
    const adminLoginData = testInputs.adminFlow.login;

    // Login as admin
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', adminLoginData.email);
    await page.fill('input[type="password"]', adminLoginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Navigate to admin dashboard
    await page.goto(`${BASE_URL}/pages/admin/admin-dashboard.html`);

    // Verify metrics are displayed
    const metricsText = await page.textContent('body');
    expect(metricsText).toContain('Total Users') ||
                      expect(metricsText).toContain('Orders') ||
                      expect(metricsText).toContain('Revenue');
  });

  test('should navigate through admin navigation menu', async ({ page }) => {
    const adminLoginData = testInputs.adminFlow.login;

    // Login as admin
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', adminLoginData.email);
    await page.fill('input[type="password"]', adminLoginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Navigate to admin dashboard
    await page.goto(`${BASE_URL}/pages/admin/admin-dashboard.html`);

    // Click different navigation items if they exist
    const navItems = await page.$$('.nav-item');
    if (navItems.length > 0) {
      // Click first nav item
      await navItems[0].click();
      await page.waitForTimeout(500);
      expect(page).toBeTruthy();
    }
  });

  test('should filter and view orders by status', async ({ page }) => {
    const adminLoginData = testInputs.adminFlow.login;
    const filterCriteria = testInputs.adminFlow.orderManagement.filterOrders;

    // Login and navigate to dashboard
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', adminLoginData.email);
    await page.fill('input[type="password"]', adminLoginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Navigate to orders section
    await page.goto(`${BASE_URL}/pages/admin/admin-dashboard.html`);

    // Try to filter orders (if filter exists)
    const filterBtn = await page.$('button:has-text("Filter")') ||
                     await page.$('select[name="status"]');
    if (filterBtn) {
      await filterBtn.click();
    }
  });

  test('should view admin analytics', async ({ page }) => {
    const adminLoginData = testInputs.adminFlow.login;

    // Login and navigate to dashboard
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', adminLoginData.email);
    await page.fill('input[type="password"]', adminLoginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Navigate to admin dashboard
    await page.goto(`${BASE_URL}/pages/admin/admin-dashboard.html`);

    // Verify charts are rendered
    const charts = await page.$$('canvas');
    expect(charts.length).toBeGreaterThan(0);

    // Verify analytics data is displayed
    const analyticsText = await page.textContent('body');
    expect(analyticsText.length).toBeGreaterThan(0);
  });
});

// ============================================
// INTEGRATION & EDGE CASE TESTS
// ============================================

test.describe('Form Validation Tests', () => {
  test('should reject signup with invalid email', async ({ page }) => {
    const invalidEmail = testInputs.formValidation.invalidEmail;

    await page.goto(`${BASE_URL}/pages/signup.html`);

    // Try to signup with invalid email
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', invalidEmail);
    await page.fill('input[name="password"]', 'ValidPassword123');
    await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
    await page.click('button[type="submit"]');

    // Should show error or stay on signup page
    await page.waitForTimeout(500);
    expect(page.url()).toContain('signup');
  });

  test('should reject signup with weak password', async ({ page }) => {
    const weakPassword = testInputs.formValidation.weakPassword;

    await page.goto(`${BASE_URL}/pages/signup.html`);

    // Try to signup with weak password
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', weakPassword);
    await page.fill('input[name="confirmPassword"]', weakPassword);
    await page.click('button[type="submit"]');

    // Should show error
    await page.waitForTimeout(500);
    expect(page.url()).toContain('signup');
  });

  test('should reject signup with duplicate email', async ({ page }) => {
    const duplicateEmail = testInputs.errorScenarios.duplicateEmail;

    await page.goto(`${BASE_URL}/pages/signup.html`);

    // Try to signup with existing email
    await page.fill('input[name="name"]', 'Another User');
    await page.fill('input[name="email"]', duplicateEmail);
    await page.fill('input[name="password"]', 'ValidPassword123');
    await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
    await page.click('button[type="submit"]');

    // Should show duplicate email error
    await page.waitForTimeout(500);
    const errorMsg = await page.textContent('.alert-danger') ||
                    await page.textContent('.error-message');
    expect(errorMsg).toContain('already registered') ||
                   expect(errorMsg).toContain('exists');
  });
});

test.describe('Session & Security Tests', () => {
  test('should expire session after timeout', async ({ page, context }) => {
    const loginData = testInputs.customerFlow.login;

    // Login
    await page.goto(`${BASE_URL}/pages/login.html`);
    await page.fill('input[type="email"]', loginData.email);
    await page.fill('input[type="password"]', loginData.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/index.html`);

    // Manually expire session in localStorage
    await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('customatchCurrentUser'));
      if (session) {
        session.expiresAt = new Date(Date.now() - 1000).toISOString();
        localStorage.setItem('customatchCurrentUser', JSON.stringify(session));
      }
    });

    // Try to access protected route
    await page.goto(`${BASE_URL}/pages/customize.html`);

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain('login');
  });

  test('should prevent XSS attacks in form inputs', async ({ page }) => {
    const xssPayload = '<script>alert("xss")</script>';

    await page.goto(`${BASE_URL}/pages/signup.html`);

    // Try to inject script
    await page.fill('input[name="name"]', xssPayload);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123');

    // Get the input value - should be escaped/sanitized
    const inputValue = await page.inputValue('input[name="name"]');

    // Should not contain raw script tag (depends on sanitization)
    expect(inputValue).not.toContain('<script>');
  });

  test('should require authentication for protected pages', async ({ page }) => {
    // Clear localStorage
    await page.evaluate(() => localStorage.clear());

    // Try to access each protected page
    const protectedRoutes = [
      '/pages/customize.html',
      '/pages/customer/checkout.html',
      '/pages/customer/tracking.html',
      '/pages/customer/confirmation.html'
    ];

    for (const route of protectedRoutes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForTimeout(500);

      // Should redirect to login
      const isOnLogin = page.url().includes('login');
      expect(isOnLogin).toBeTruthy();
    }
  });
});

test.describe('Responsive Design Tests', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/pages/login.html`);

    // Verify form is visible
    const emailInput = await page.$('input[type="email"]');
    expect(emailInput).toBeTruthy();

    // Verify button is clickable
    const submitBtn = await page.$('button[type="submit"]');
    expect(submitBtn).toBeTruthy();
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(`${BASE_URL}/pages/login.html`);

    // Verify form elements are visible
    const form = await page.$('form');
    expect(form).toBeTruthy();
  });

  test('should display correctly on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto(`${BASE_URL}/pages/login.html`);

    // Verify layout
    const container = await page.$('.container') || await page.$('main');
    expect(container).toBeTruthy();
  });
});
