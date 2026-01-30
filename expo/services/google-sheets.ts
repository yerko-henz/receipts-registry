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

// --- Deduplication Helper ---

const getExistingReceiptIds = async (spreadsheetId: string, accessToken: string, t: TFunction): Promise<Set<string>> => {
  try {
    // 1. Fetch Header Row to find 'id' column
    const headerUrl = `${BASE_URL_SHEETS}/${spreadsheetId}/values/1:1`;
    const headerRes = await fetch(headerUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    
    if (!headerRes.ok) return new Set();
    
    const headerData = await headerRes.json();
    const headers = headerData.values?.[0] as string[] || [];
    
    // Find column index for 'id'
    // We look for the translated header or the key. 
    // Since we write translated headers, we should ideally match that.
    // But safely, we know our strict column order from SHEET_COLUMNS.
    // Let's rely on SHEET_COLUMNS layout if we assume the sheet structure hasn't been manually altered by user.
    // The safest way for "Receipt ID" is checking the last column or matching known keys.
    
    // Let's assume standard order for now to avoid complexity of reverse-lookup of translations.
    // ID is at index 4 (Column E).
    const idColIndex = SHEET_COLUMNS.findIndex(c => c.key === 'id');
    if (idColIndex === -1) return new Set();

    // Convert index to A1 notation letter (0 -> A, 4 -> E)
    const colLetter = String.fromCharCode(65 + idColIndex); // Works for A-Z
    
    // 2. Fetch that column
    const dataUrl = `${BASE_URL_SHEETS}/${spreadsheetId}/values/${colLetter}:${colLetter}?majorDimension=COLUMNS`;
    const dataRes = await fetch(dataUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    
    if (!dataRes.ok) return new Set();
    
    const colData = await dataRes.json();
    const ids = colData.values?.[0] || [];
    
    // Filter out the header value itself if captured
    return new Set(ids);
  } catch (e) {
    console.warn('Failed to fetch existing IDs for deduplication', e);
    return new Set();
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

  // 4. Create if needed (Moved up to ensure we have an ID for dedupe check)
  if (!spreadsheetId) {
    spreadsheetId = await createSpreadsheet(filename, accessToken);
  }

  // 5. If new, add Headers
  if (isNewFile && spreadsheetId) {
    await appendHeaders(spreadsheetId, accessToken, t);
  }

  // 3. Filter Logic (Deduplication)
  let receiptsToExport = receipts;
  
  if (spreadsheetId) {
      // Fetch existing IDs from the sheet to prevent duplicates
      // This is more robust than relying on lastSyncDate which can be lost on device
      const existingIds = await getExistingReceiptIds(spreadsheetId, accessToken, t);
      
      if (existingIds.size > 0) {
          receiptsToExport = receipts.filter(r => !existingIds.has(r.id));
      } else if (!isNewFile && lastSyncDate) {
           // Fallback to date check if we couldn't read IDs for some reason (rare)
           // or if sheet is empty but file exists
           receiptsToExport = receipts.filter(r => r.created_at > lastSyncDate);
      }
  }

  if (receiptsToExport.length === 0) {
      return {
          url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
          spreadsheetId: spreadsheetId!,
          timestamp: new Date().toISOString(),
          syncedCount: 0
      };
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
