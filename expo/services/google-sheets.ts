import { GoogleSignin } from '../lib/google-signin';
import { Receipt } from './receipts';
import { TFunction } from 'i18next';

const BASE_URL_SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const BASE_URL_DRIVE = 'https://www.googleapis.com/drive/v3/files';

// Centralised Column Configuration
// Easy to modify: just add/remove objects here.
const SHEET_COLUMNS = [
  { headerKey: 'receipts.receiptDate', key: 'transaction_date' },
  { headerKey: 'receipts.merchant', key: 'merchant_name' },
  { headerKey: 'receipts.total', key: 'total_amount' },
  { headerKey: 'receipts.link', key: 'image_url' },
  { headerKey: 'receipts.id', key: 'id' },
];

const getAccessToken = async () => {
  if (!GoogleSignin) {
    throw new Error('Google Sign-In is not initialized. Are you running in a Development Build? This feature requires native modules.');
  }
  // Ensure user is signed in
  const hasSession = GoogleSignin.hasPreviousSignIn();
  if (!hasSession) {
      try {
          await GoogleSignin.signIn();
      } catch (signInError) {
          throw new Error('You must sign in with Google to export to Sheets.');
      }
  }

  const tokens = await GoogleSignin.getTokens();
  return tokens.accessToken;
};

// --- Drive API Helpers ---

const findSheet = async (title: string, accessToken: string): Promise<string | null> => {
  const query = `name = '${title}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const url = `${BASE_URL_DRIVE}?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
     // If searches fail, we default to not found
     return null; 
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id; // Return the first match
  }
  return null;
};

// --- Sheets API Helpers ---

const createSpreadsheet = async (title: string, accessToken: string): Promise<string> => {
  const response = await fetch(BASE_URL_SHEETS, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create spreadsheet');
  }

  const result = await response.json();
  return result.spreadsheetId;
};

const appendHeaders = async (spreadsheetId: string, accessToken: string, t: TFunction) => {
  const headers = SHEET_COLUMNS.map(col => t(col.headerKey, { defaultValue: col.headerKey }));
  
  await fetch(`${BASE_URL_SHEETS}/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [headers],
    }),
  });
};

const appendRows = async (spreadsheetId: string, receipts: Receipt[], accessToken: string) => {
  const rows = receipts.map(r => {
    return SHEET_COLUMNS.map(col => {
      // @ts-ignore
      const val = r[col.key];
      return val || ''; // Handle null/undefined
    });
  });

  const response = await fetch(`${BASE_URL_SHEETS}/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to append rows');
  }
};

// --- Main Export Function ---

export const syncReceiptsToSheet = async (receipts: Receipt[], lastSyncDate: string | null, t: TFunction) => {
  const accessToken = await getAccessToken();

  // 1. Determine Filename (Translated)
  const appName = 'Receipts Register';
  const receiptsLabel = t('receipts.title', { defaultValue: 'Receipts' });
  const filename = `${appName} - ${receiptsLabel}`;

  // 2. Find or Create
  let spreadsheetId = await findSheet(filename, accessToken);
  const isNewFile = !spreadsheetId;

  // 3. Filter Logic
  // If file exists, we only want NEW receipts.
  // If file is NEW (was deleted or first run), we want ALL receipts.
  let receiptsToExport = receipts;
  
  if (!isNewFile && lastSyncDate) {
      receiptsToExport = receipts.filter(r => r.created_at > lastSyncDate);
      
      if (receiptsToExport.length === 0) {
          // Nothing new to add
          return {
              url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
              spreadsheetId: spreadsheetId!,
              timestamp: new Date().toISOString(), // Update timestamp to now, confirming we checked
              syncedCount: 0
          };
      }
  }

  // 4. Create if needed
  if (!spreadsheetId) {
    spreadsheetId = await createSpreadsheet(filename, accessToken);
  }

  // 5. If new, add Headers first
  if (isNewFile && spreadsheetId) {
    await appendHeaders(spreadsheetId, accessToken, t);
  }

  // 6. Append Data
  if (spreadsheetId) {
    await appendRows(spreadsheetId, receiptsToExport, accessToken);
    
    return {
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      spreadsheetId,
      timestamp: new Date().toISOString(),
      syncedCount: receiptsToExport.length
    };
  }

  throw new Error('Failed to identify spreadsheet ID');
};
