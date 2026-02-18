import { test as setup, expect } from '@playwright/test';
import { realLoginSupabase } from './utils';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  if (process.env.USE_REAL_DATA !== 'true') {
    console.log('Skipping real authentication (USE_REAL_DATA not true)');
    return;
  }
  
  console.log('Starting authentication setup...');
  // setup.use is not accessible here, use env directly or skip log
  console.log('Target URL:', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000');
  
  await realLoginSupabase(page);
  console.log('Login successful, saving storage state to:', authFile);
  await page.context().storageState({ path: authFile });
});
