import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Full-Stack Journey (Layer 3)', () => {
    const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || '1111111111111111';
    const TEST_PROJECT_TITLE = 'E2E Test Project ' + Date.now();

    test('should allow admin to login and create a project that appears publicly', async ({ page }) => {
        test.setTimeout(120000); // Increase timeout for full-stack build/orchestration
        
        page.on('console', msg => {
            const text = msg.text();
            console.warn(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}:`, text);
        });

        // Poll URL effectively
        const urlInterval = setInterval(() => {
            console.warn(`[E2E URL] ${page.url()}`);
        }, 1000);

        page.on('close', () => clearInterval(urlInterval));

        page.on('response', async response => {
            const url = response.url();
            if (url.includes('/api/v1/')) {
                const status = response.status();
                try {
                    const text = await response.text();
                    let body = text;
                    try {
                        const json = JSON.parse(text);
                        body = JSON.stringify(json);
                    } catch (_e) {
                        // ignore
                    }
                    console.warn(`[API RESPONSE] ${url} | Status: ${status} | Body: ${body}`);
                } catch (_e) {
                    console.warn(`[API RESPONSE] ${url} | Status: ${status} | (Body unreadable)`);
                }
            }
        });        
        // 1. Login as Admin
        console.warn('[E2E] Navigating to login...');
        
        // Pre-set localStorage to suppress the PersonaSelector modal
        await page.addInitScript(() => {
            localStorage.setItem('portfolio_has_seen_persona', 'true');
        });
        
        await page.goto('/admin/login');
        
        // Wait for the page to fully settle - the PersonaSelector modal has a 1500ms delay
        await page.waitForTimeout(2500);
        
        // Forcefully remove any modal overlays from the DOM
        await page.evaluate(() => {
            // Remove PersonaSelector modal overlay if present
            document.querySelectorAll('[class*="fixed"][class*="inset-0"]').forEach(el => {
                if (el.closest('[class*="z-[var(--z-modal)]"]') || el.textContent?.includes('Choose Your Path')) {
                    (el.closest('[class*="z-[var(--z-modal)]"]') || el.parentElement)?.remove();
                }
            });
            // Also remove any remaining fixed overlays that might block clicks
            document.querySelectorAll('.fixed.inset-0').forEach(el => el.remove());
        });
        
        const passwordInput = page.locator('input[type="password"]').first();
        await expect(passwordInput).toBeVisible({ timeout: 15000 });
        await passwordInput.fill(ADMIN_PASSWORD);
        
        const signinBtn = page.getByRole('button', { name: /Sign In/i }).first();
        await expect(signinBtn).toBeVisible({ timeout: 10000 });
        
        console.warn('[E2E] Clicking Sign In...');
        await signinBtn.click();
        
        await page.waitForURL('**/admin', { timeout: 40000 });
        await expect(page).toHaveURL(/\/admin/);

        // 2. Navigate to Projects tab
        console.warn('[E2E] Navigating to Projects tab...');
        const projectsTab = page.getByRole('button', { name: /Projects|Artifacts/i }).first();
        await projectsTab.click();
        
        // 3. Click "Add Project" (Initialize Repository / Initialize New Artifact)
        console.warn('[E2E] Clicking Add button...');
        const addBtn = page.locator('button').filter({ hasText: /Initialize Repository|Initialize New Artifact/i })
            .or(page.getByTitle('Initialize New Artifact'));
        
        await expect(addBtn.first()).toBeVisible({ timeout: 15000 });
        await addBtn.first().click();

        // 4. Fill Project Form
        console.warn('[E2E] Filling project form...');
        await page.getByPlaceholder(/Enter primary designation/i).fill(TEST_PROJECT_TITLE);
        await page.getByPlaceholder(/Classification/i).fill('E2E Testing');
        
        // Description (Executive Architecture Summary) - lazy-loaded editor
        const editor = page.locator('.ProseMirror').first();
        await expect(editor).toBeVisible({ timeout: 30000 }); // Wait for lazy-loaded TipTap chunk
        await editor.click(); // Focus first
        await editor.pressSequentially('This project was created by an automated E2E test.', { delay: 10 });
        
        // Image Upload (Schema requires imageUrl to be not-null)
        console.warn('[E2E] Uploading project image...');
        const testImagePath = path.join(process.cwd(), 'e2e', 'test-image.png');
        try {
            // Write a tiny 1x1 transparent PNG with 'wx' flag to fail atomically if it already exists
            fs.writeFileSync(
                testImagePath, 
                Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'), 
                { flag: 'wx' }
            );
        } catch (err: any) {
            if (err.code !== 'EEXIST') {
                throw err;
            }
        }
        
        // Find the hidden file input
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(testImagePath);
        
        // Wait for upload to complete (Loading indicator goes away)
        await page.locator('text=Uploading...').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}); // might be too fast to see
        await page.locator('text=Uploading...').waitFor({ state: 'hidden', timeout: 15000 });
        
        // Submit (Commit Artifact)
        console.warn('[E2E] Committing artifact...');
        const commitBtn = page.getByRole('button', { name: /Commit Artifact/i }).first();
        await commitBtn.scrollIntoViewIfNeeded();
        await commitBtn.click({ force: true });

        
        // Wait for success - targeting the modal/form specifically to ensure it's gone
        console.warn('[E2E] Project created, verifying in list...');
        const formInput = page.getByPlaceholder(/Enter primary designation/i).first();
        await expect(formInput).not.toBeVisible({ timeout: 20000 });
        
        // Final verification in the list
        await expect(page.getByText(TEST_PROJECT_TITLE)).toBeVisible({ timeout: 15000 });


        // 5. Verify on Public Portfolio
        console.warn('[E2E] Verifying project visibility on public site...');
        await page.goto('/projects');
        
        // The project should be visible in the list
        const publicProject = page.getByText(TEST_PROJECT_TITLE).first();
        await expect(publicProject).toBeVisible({ timeout: 15000 });
        
        console.warn('[E2E] \u2705 Full-stack journey successful!');
    });
});
