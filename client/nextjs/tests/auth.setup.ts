import { test as setup, expect } from '@playwright/test';
import { realLoginSupabase } from './utils';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  if (process.env.USE_REAL_DATA !== 'true') {
    console.log('Skipping real authentication (USE_REAL_DATA not true)');
    return;
  }
  
  await realLoginSupabase(page);
  await page.context().storageState({ path: authFile });
});
