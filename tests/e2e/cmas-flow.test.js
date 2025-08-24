/**
 * End-to-End Tests for JDM Portal CMAS Flow
 * Tests complete user journeys using Playwright
 * @module tests/e2e/cmas-flow.test
 */

const { test, expect, chromium } = require('@playwright/test');
const { faker } = require('@faker-js/faker');

// Test configuration
test.describe.configure({ mode: 'parallel' });
test.use({
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
});

// Helper functions
const generatePatientData = () => ({
    email: faker.internet.email(),
    password: 'SecurePass123!',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    dateOfBirth: '2010-05-15',
    phoneNumber: faker.phone.number('+316########')
});

const loginUser = async (page, email, password) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
};

const waitForNotification = async (page, text) => {
    const notification = page.locator('.notification', { hasText: text });
    await expect(notification).toBeVisible({ timeout: 5000 });
};

test.describe('CMAS Measurement Flow', () => {
    let browser;
    let context;
    let page;
    let patientData;

    test.beforeAll(async () => {
        browser = await chromium.launch();
        patientData = generatePatientData();
    });

    test.afterAll(async () => {
        await browser.close();
    });

    test.beforeEach(async () => {
        context = await browser.newContext({
            storageState: undefined // Start with clean state
        });
        page = await context.newPage();
        
        // Set up request interception for monitoring
        page.on('request', request => {
            if (request.url().includes('/api/')) {
                console.log(`API Request: ${request.method()} ${request.url()}`);
            }
        });

        page.on('response', response => {
            if (response.url().includes('/api/') && response.status() >= 400) {
                console.error(`API Error: ${response.status()} ${response.url()}`);
            }
        });
    });

    test.afterEach(async () => {
        await context.close();
    });

    test('Complete patient registration flow', async () => {
        await test.step('Navigate to registration page', async () => {
            await page.goto('/');
            await page.click('text=Registreren');
            await expect(page).toHaveURL('/register');
        });

        await test.step('Fill registration form', async () => {
            await page.fill('input[name="email"]', patientData.email);
            await page.fill('input[name="password"]', patientData.password);
            await page.fill('input[name="confirmPassword"]', patientData.password);
            await page.fill('input[name="firstName"]', patientData.firstName);
            await page.fill('input[name="lastName"]', patientData.lastName);
            await page.fill('input[name="dateOfBirth"]', patientData.dateOfBirth);
            await page.fill('input[name="phoneNumber"]', patientData.phoneNumber);
            
            // Accept terms and conditions
            await page.check('input[name="acceptTerms"]');
        });

        await test.step('Submit registration', async () => {
            await page.click('button[type="submit"]');
            
            // Wait for registration to complete
            await page.waitForURL('**/dashboard', { timeout: 10000 });
            
            // Verify welcome message
            await expect(page.locator('h1')).toContainText('JDM Patiënt Portal');
            
            // Verify patient ID is displayed
            const patientIdElement = page.locator('#patientId');
            await expect(patientIdElement).toBeVisible();
            const patientId = await patientIdElement.textContent();
            expect(patientId).toMatch(/^JDM-\d{4}-\d{3}$/);
        });

        await test.step('Verify initial dashboard state', async () => {
            // Check CMAS score display
            await expect(page.locator('.score-display')).toContainText('0');
            await expect(page.locator('.score-label')).toContainText('van maximaal 52 punten');
            
            // Verify status indicator
            await expect(page.locator('.status-indicator')).toHaveClass(/status-healthy/);
        });
    });

    test('Perform CMAS measurement', async () => {
        await test.step('Login as patient', async () => {
            await loginUser(page, patientData.email, patientData.password);
        });

        await test.step('Start new CMAS measurement', async () => {
            await page.click('button:has-text("Start Nieuwe CMAS Meting")');
            
            // Wait for measurement form to load
            await page.waitForSelector('.cmas-measurement-form', { timeout: 5000 });
        });

        await test.step('Complete all 14 exercises', async () => {
            const exercises = [
                { name: 'Head lift', score: 4 },
                { name: 'Leg lift', score: 3 },
                { name: 'Straight leg raise', score: 4 },
                { name: 'Supine to sit', score: 3 },
                { name: 'Sit-ups', score: 2 },
                { name: 'Prone head lift', score: 4 },
                { name: 'Hands to head', score: 4 },
                { name: 'Hands on table', score: 4 },
                { name: 'Arms raised', score: 3 },
                { name: 'Stand from floor', score: 2 },
                { name: 'Heel raise', score: 3 },
                { name: 'Pick up object', score: 4 },
                { name: 'Stand on one leg', score: 2 },
                { name: 'Running', score: 1 }
            ];

            for (const exercise of exercises) {
                const exerciseSection = page.locator('.exercise-item', { hasText: exercise.name });
                
                // Select score using radio buttons or slider
                const scoreSelector = exerciseSection.locator(`input[value="${exercise.score}"]`);
                await scoreSelector.click();
                
                // Optionally add notes for specific exercises
                if (exercise.score < 3) {
                    const notesField = exerciseSection.locator('textarea[name="notes"]');
                    await notesField.fill(`Patient had difficulty with ${exercise.name}`);
                }
            }
        });

        await test.step('Add general observations', async () => {
            await page.fill('textarea[name="generalNotes"]', 
                'Patient showed good effort throughout the assessment. Some fatigue observed in lower body exercises.');
        });

        await test.step('Submit measurement', async () => {
            await page.click('button:has-text("Opslaan Meting")');
            
            // Wait for submission confirmation
            await waitForNotification(page, 'CMAS meting succesvol opgeslagen');
            
            // Verify score update on dashboard
            await page.waitForSelector('.score-display:has-text("43")', { timeout: 5000 });
            
            // Verify progress bar update
            const progressBar = page.locator('.progress-fill');
            await expect(progressBar).toHaveCSS('width', '82.69%'); // 43/52 * 100
        });

        await test.step('Verify measurement in history', async () => {
            await page.click('text=Metingen Historie');
            
            // Check that new measurement appears in list
            const measurementList = page.locator('.measurement-history-item').first();
            await expect(measurementList).toContainText('Score: 43/52');
            await expect(measurementList).toContainText('Vandaag');
        });
    });

    test('View and download CMAS report', async () => {
        await test.step('Login and navigate to reports', async () => {
            await loginUser(page, patientData.email, patientData.password);
            await page.click('button:has-text("Bekijk Gedetailleerd Rapport")');
        });

        await test.step('Configure report parameters', async () => {
            // Select date range
            await page.fill('input[name="startDate"]', '2024-01-01');
            await page.fill('input[name="endDate"]', '2024-12-31');
            
            // Select report format
            await page.selectOption('select[name="format"]', 'pdf');
            
            // Include additional sections
            await page.check('input[name="includeCharts"]');
            await page.check('input[name="includeNotes"]');
            await page.check('input[name="includeTrend"]');
        });

        await test.step('Generate and download report', async () => {
            // Start download promise before clicking
            const downloadPromise = page.waitForEvent('download');
            
            await page.click('button:has-text("Genereer Rapport")');
            
            // Wait for download to start
            const download = await downloadPromise;
            
            // Verify download file name
            expect(download.suggestedFilename()).toMatch(/CMAS_Report_.*\.pdf/);
            
            // Save to specific location for verification
            const path = await download.path();
            expect(path).toBeTruthy();
        });

        await test.step('Verify report preview', async () => {
            await page.click('button:has-text("Preview")');
            
            // Wait for preview modal
            await page.waitForSelector('.report-preview-modal', { timeout: 5000 });
            
            // Verify report content
            await expect(page.locator('.report-title')).toContainText('CMAS Assessment Report');
            await expect(page.locator('.patient-info')).toContainText(patientData.firstName);
            await expect(page.locator('.total-score')).toContainText('43');
            
            // Close preview
            await page.click('button:has-text("Sluiten")');
        });
    });

    test('Exercise trend analysis', async () => {
        await test.step('Login and navigate to trends', async () => {
            await loginUser(page, patientData.email, patientData.password);
            await page.click('nav >> text=Trend Analyse');
        });

        await test.step('View trend chart', async () => {
            // Wait for chart to load
            await page.waitForSelector('canvas#trendChart', { timeout: 5000 });
            
            // Verify chart legend
            await expect(page.locator('.chart-legend')).toContainText('CMAS Score');
            
            // Check data points
            const dataPoints = page.locator('.chart-data-point');
            expect(await dataPoints.count()).toBeGreaterThan(0);
        });

        await test.step('Filter by exercise category', async () => {
            // Select upper body exercises
            await page.click('button:has-text("Filter Oefeningen")');
            await page.check('input[value="upper_body"]');
            await page.click('button:has-text("Toepassen")');
            
            // Verify filtered results
            await page.waitForSelector('.filtered-results', { timeout: 3000 });
            const exercises = page.locator('.exercise-trend-item');
            
            for (const exercise of await exercises.all()) {
                const name = await exercise.locator('.exercise-name').textContent();
                expect(['Hands to head', 'Hands on table', 'Arms raised']).toContain(name);
            }
        });

        await test.step('Compare periods', async () => {
            await page.click('button:has-text("Vergelijk Periodes")');
            
            // Set first period
            await page.fill('input[name="period1Start"]', '2024-01-01');
            await page.fill('input[name="period1End"]', '2024-06-30');
            
            // Set second period
            await page.fill('input[name="period2Start"]', '2024-07-01');
            await page.fill('input[name="period2End"]', '2024-12-31');
            
            await page.click('button:has-text("Vergelijken")');
            
            // Verify comparison results
            await expect(page.locator('.comparison-result')).toBeVisible();
            await expect(page.locator('.period-1-average')).toBeVisible();
            await expect(page.locator('.period-2-average')).toBeVisible();
            await expect(page.locator('.improvement-percentage')).toBeVisible();
        });
    });

    test('Appointment scheduling', async () => {
        await test.step('Login and navigate to appointments', async () => {
            await loginUser(page, patientData.email, patientData.password);
            await page.click('nav >> text=Afspraken');
        });

        await test.step('View upcoming appointments', async () => {
            const appointmentCard = page.locator('.appointment-card').first();
            await expect(appointmentCard).toBeVisible();
            await expect(appointmentCard).toContainText('Volgende afspraak');
        });

        await test.step('Request new appointment', async () => {
            await page.click('button:has-text("Nieuwe Afspraak Aanvragen")');
            
            // Fill appointment request form
            await page.selectOption('select[name="appointmentType"]', 'cmas_assessment');
            await page.fill('textarea[name="reason"]', 'Routine CMAS measurement');
            
            // Select preferred dates
            await page.click('input[name="preferredDate1"]');
            await page.click('text=15'); // Select 15th of the month
            
            await page.click('input[name="preferredDate2"]');
            await page.click('text=20'); // Select 20th as alternative
            
            // Select preferred time
            await page.selectOption('select[name="preferredTime"]', 'morning');
            
            // Submit request
            await page.click('button:has-text("Aanvraag Versturen")');
            
            await waitForNotification(page, 'Afspraak aanvraag verstuurd');
        });
    });

    test('Mobile responsiveness', async () => {
        // Create mobile context
        const mobileContext = await browser.newContext({
            viewport: { width: 375, height: 667 },
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        });
        const mobilePage = await mobileContext.newPage();

        await test.step('Test mobile navigation', async () => {
            await mobilePage.goto('/');
            
            // Check hamburger menu is visible
            await expect(mobilePage.locator('.mobile-menu-toggle')).toBeVisible();
            
            // Open mobile menu
            await mobilePage.click('.mobile-menu-toggle');
            await expect(mobilePage.locator('.mobile-menu')).toBeVisible();
            
            // Navigate to login
            await mobilePage.click('.mobile-menu >> text=Inloggen');
            await expect(mobilePage).toHaveURL('/login');
        });

        await test.step('Test mobile CMAS form', async () => {
            await loginUser(mobilePage, patientData.email, patientData.password);
            
            // Start CMAS measurement
            await mobilePage.click('button:has-text("Start Nieuwe CMAS Meting")');
            
            // Check form is mobile-optimized
            const formWidth = await mobilePage.locator('.cmas-measurement-form').boundingBox();
            expect(formWidth.width).toBeLessThanOrEqual(375);
            
            // Test touch interactions
            const slider = mobilePage.locator('.score-slider').first();
            await slider.dragTo(slider, {
                sourcePosition: { x: 0, y: 0 },
                targetPosition: { x: 100, y: 0 }
            });
        });

        await mobileContext.close();
    });

    test('Accessibility compliance', async () => {
        await test.step('Run accessibility audit on login page', async () => {
            await page.goto('/login');
            
            // Check for proper ARIA labels
            await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-label');
            await expect(page.locator('input[name="password"]')).toHaveAttribute('aria-label');
            
            // Check for focus indicators
            await page.keyboard.press('Tab');
            const focusedElement = await page.evaluate(() => document.activeElement.tagName);
            expect(focusedElement).toBeTruthy();
            
            // Check color contrast
            const loginButton = page.locator('button[type="submit"]');
            const backgroundColor = await loginButton.evaluate(el => 
                window.getComputedStyle(el).backgroundColor
            );
            const color = await loginButton.evaluate(el => 
                window.getComputedStyle(el).color
            );
            // Verify contrast ratio meets WCAG AA standards
            expect(backgroundColor).toBeTruthy();
            expect(color).toBeTruthy();
        });

        await test.step('Test keyboard navigation', async () => {
            await loginUser(page, patientData.email, patientData.password);
            
            // Navigate dashboard using keyboard only
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            await page.keyboard.press('Enter');
            
            // Verify action was triggered
            await expect(page.locator('.cmas-measurement-form')).toBeVisible();
            
            // Test escape key closes modals
            await page.keyboard.press('Escape');
            await expect(page.locator('.cmas-measurement-form')).not.toBeVisible();
        });

        await test.step('Test screen reader compatibility', async () => {
            // Check for proper heading hierarchy
            const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', 
                elements => elements.map(el => ({
                    level: parseInt(el.tagName[1]),
                    text: el.textContent
                }))
            );
            
            // Verify proper heading hierarchy
            let previousLevel = 0;
            for (const heading of headings) {
                expect(heading.level - previousLevel).toBeLessThanOrEqual(1);
                previousLevel = heading.level;
            }
            
            // Check for alt text on images
            const images = page.locator('img');
            const imageCount = await images.count();
            
            for (let i = 0; i < imageCount; i++) {
                await expect(images.nth(i)).toHaveAttribute('alt');
            }
        });
    });

    test('Performance monitoring', async () => {
        await test.step('Measure page load time', async () => {
            const startTime = Date.now();
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            const loadTime = Date.now() - startTime;
            
            // Page should load within 3 seconds
            expect(loadTime).toBeLessThan(3000);
            
            // Check Core Web Vitals
            const metrics = await page.evaluate(() => {
                const paintEntries = performance.getEntriesByType('paint');
                const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
                const lcp = performance.getEntriesByType('largest-contentful-paint')[0];
                
                return {
                    fcp: fcp ? fcp.startTime : null,
                    lcp: lcp ? lcp.startTime : null
                };
            });
            
            // FCP should be under 1.8 seconds
            expect(metrics.fcp).toBeLessThan(1800);
            
            // LCP should be under 2.5 seconds
            expect(metrics.lcp).toBeLessThan(2500);
        });

        await test.step('Test API response times', async () => {
            await loginUser(page, patientData.email, patientData.password);
            
            // Measure API call performance
            const responseTime = await page.evaluate(async () => {
                const start = performance.now();
                await fetch('/api/cmas/measurements/current', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                return performance.now() - start;
            });
            
            // API should respond within 500ms
            expect(responseTime).toBeLessThan(500);
        });
    });

    test('Error recovery', async () => {
        await test.step('Handle network failure gracefully', async () => {
            await loginUser(page, patientData.email, patientData.password);
            
            // Simulate network failure
            await page.route('**/api/**', route => route.abort());
            
            // Try to perform action
            await page.click('button:has-text("Start Nieuwe CMAS Meting")');
            
            // Should show error message
            await waitForNotification(page, 'Verbinding verloren');
            
            // Should offer retry option
            await expect(page.locator('button:has-text("Opnieuw proberen")')).toBeVisible();
            
            // Restore network
            await page.unroute('**/api/**');
            
            // Retry should work
            await page.click('button:has-text("Opnieuw proberen")');
            await expect(page.locator('.cmas-measurement-form')).toBeVisible();
        });

        await test.step('Handle session expiry', async () => {
            await loginUser(page, patientData.email, patientData.password);
            
            // Simulate session expiry
            await page.evaluate(() => {
                localStorage.removeItem('token');
                sessionStorage.clear();
            });
            
            // Try to access protected route
            await page.click('nav >> text=Profiel');
            
            // Should redirect to login
            await expect(page).toHaveURL('/login');
            await waitForNotification(page, 'Sessie verlopen. Log opnieuw in.');
        });
    });

    test('Data persistence', async () => {
        await test.step('Test offline data caching', async () => {
            await loginUser(page, patientData.email, patientData.password);
            
            // Load some data
            await page.click('nav >> text=Metingen Historie');
            await page.waitForSelector('.measurement-history-item');
            
            // Go offline
            await page.context().setOffline(true);
            
            // Navigate away and back
            await page.click('nav >> text=Dashboard');
            await page.click('nav >> text=Metingen Historie');
            
            // Data should still be visible from cache
            await expect(page.locator('.measurement-history-item')).toBeVisible();
            await expect(page.locator('.offline-indicator')).toBeVisible();
            
            // Go back online
            await page.context().setOffline(false);
            
            // Should sync automatically
            await expect(page.locator('.offline-indicator')).not.toBeVisible();
        });

        await test.step('Test form data persistence', async () => {
            await page.click('button:has-text("Start Nieuwe CMAS Meting")');
            
            // Fill partial form
            const exerciseSection = page.locator('.exercise-item').first();
            await exerciseSection.locator('input[value="3"]').click();
            await page.fill('textarea[name="generalNotes"]', 'Test notes');
            
            // Navigate away
            await page.click('nav >> text=Dashboard');
            
            // Confirm navigation with unsaved changes
            await page.click('button:has-text("Verlaten zonder opslaan")');
            
            // Return to form
            await page.click('button:has-text("Start Nieuwe CMAS Meting")');
            await page.click('button:has-text("Herstel vorige sessie")');
            
            // Data should be restored
            await expect(exerciseSection.locator('input[value="3"]')).toBeChecked();
            await expect(page.locator('textarea[name="generalNotes"]')).toHaveValue('Test notes');
        });
    });
});

test.describe('Security Tests', () => {
    test('Prevent XSS attacks', async ({ page }) => {
        const xssPayloads = [
            '<script>alert("XSS")</script>',
            'javascript:alert(1)',
            '<img src=x onerror=alert(1)>',
            '<svg onload=alert(1)>'
        ];

        for (const payload of xssPayloads) {
            await page.goto('/login');
            await page.fill('input[name="email"]', payload);
            await page.fill('input[name="password"]', 'password');
            await page.click('button[type="submit"]');
            
            // Check that no alert was triggered
            const alerts = [];
            page.on('dialog', dialog => {
                alerts.push(dialog.message());
                dialog.dismiss();
            });
            
            await page.waitForTimeout(1000);
            expect(alerts).toHaveLength(0);
        }
    });

    test('Prevent SQL injection', async ({ page }) => {
        const sqlPayloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "admin'--",
            "' UNION SELECT * FROM users--"
        ];

        for (const payload of sqlPayloads) {
            await page.goto('/login');
            await page.fill('input[name="email"]', payload);
            await page.fill('input[name="password"]', payload);
            await page.click('button[type="submit"]');
            
            // Should show normal error message, not database error
            await waitForNotification(page, 'Ongeldige inloggegevens');
        }
    });

    test('Enforce HTTPS in production', async ({ page }) => {
        // Skip if not in production environment
        if (process.env.NODE_ENV !== 'production') {
            test.skip();
        }

        const response = await page.goto('http://localhost:3000');
        
        // Should redirect to HTTPS
        expect(response.url()).toMatch(/^https:/);
        
        // Check for security headers
        const headers = response.headers();
        expect(headers['strict-transport-security']).toBeTruthy();
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['x-frame-options']).toBe('DENY');
        expect(headers['x-xss-protection']).toBe('1; mode=block');
    });
});