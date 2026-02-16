import { Receipt } from './receipts';

// Type definitions for Google Identity Services
// We define them here to avoid ambient type issues if the d.ts is not picked up
// Type definitions for Google Identity Services
// We define them here to avoid ambient type issues if the d.ts is not picked up
declare global {
    const google: {
        accounts: {
            oauth2: {
                initTokenClient: (config: any) => TokenClient;
            };
        };
    };

    interface Window {
        google?: typeof google;
    }
}

interface TokenResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    error?: any;
}

interface TokenClient {
    requestAccessToken: (overrideConfig?: any) => void;
    callback: (response: TokenResponse) => void;
}



const BASE_URL_SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const BASE_URL_DRIVE = 'https://www.googleapis.com/drive/v3/files';

// Centralised Column Configuration
const SHEET_COLUMNS = [
  { headerKey: 'receipts.receiptDate', key: 'transaction_date' },
  { headerKey: 'receipts.merchant', key: 'merchant_name' },
  { headerKey: 'receipts.total', key: 'total_amount' },
  { headerKey: 'receipts.link', key: 'image_url' },
  { headerKey: 'receipts.id', key: 'id' },
];

let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;

export const initGoogleAuth = () => {
    if (typeof window === 'undefined' || !window.google) return;
    
    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse: TokenResponse) => {
            accessToken = tokenResponse.access_token;
            // Store expiration time if needed, but for now we rely on re-triggering if 401
        },
    });
};

const getAccessToken = async (): Promise<string> => {
    if (accessToken) return accessToken;

    return new Promise((resolve, reject) => {
        if (!tokenClient) {
             // Try initializing if not ready (e.g. script loaded late)
             initGoogleAuth();
             if (!tokenClient) {
                 return reject(new Error('Google Sign-In not initialized.'));
             }
        }

        // We need to override the callback for this specific request to resolve the promise
        // effectively making it "awaitable"
        tokenClient.callback = (tokenResponse: TokenResponse) => {
             if (tokenResponse.error) {
                 reject(tokenResponse);
             } else {
                 accessToken = tokenResponse.access_token;
                 resolve(tokenResponse.access_token);
             }
        };

        // Trigger the popup
        tokenClient.requestAccessToken();
    });
};

// Robust fetch helper that handles 401s by retrying
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    let token: string;
    try {
        token = await getAccessToken();
    } catch (e) {
        throw new Error('Failed to get access token');
    }
    
    let response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        console.log('[GoogleSheets] Token expired or invalid, retrying...');
        
        // Force new token
        accessToken = null; 
        token = await getAccessToken();
        
        response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`
            }
        });
    }

    return response;
};

// --- Drive API Helpers ---

const findSheet = async (title: string): Promise<string | null> => {
  const query = `name = '${title}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const url = `${BASE_URL_DRIVE}?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const response = await authenticatedFetch(url);

  if (!response.ok) {
     return null; 
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id; // Return the first match
  }
  return null;
};

// --- Sheets API Helpers ---

const createSpreadsheet = async (title: string): Promise<string> => {
  const response = await authenticatedFetch(BASE_URL_SHEETS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

const appendHeaders = async (spreadsheetId: string, t: (key: string) => string) => {
  const headers = SHEET_COLUMNS.map(col => t(col.headerKey));
  
  await authenticatedFetch(`${BASE_URL_SHEETS}/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      values: [headers],
    }),
  });
};

const appendRows = async (spreadsheetId: string, receipts: Receipt[]) => {
  const rows = receipts.map(r => {
    return SHEET_COLUMNS.map(col => {
      // @ts-ignore
      const val = r[col.key];
      return val || ''; // Handle null/undefined
    });
  });

  const response = await authenticatedFetch(`${BASE_URL_SHEETS}/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to append rows');
  }
};

// --- Deduplication Helper ---

const getExistingReceiptIds = async (spreadsheetId: string): Promise<Set<string>> => {
  try {
    // 1. Fetch Header Row to find 'id' column
    // We assume 'id' is in the last column based on SHEET_COLUMNS for simplicity as per mobile impl
    const idColIndex = SHEET_COLUMNS.findIndex(c => c.key === 'id');
    if (idColIndex === -1) return new Set();

    // Convert index to A1 notation letter (0 -> A, 4 -> E)
    const colLetter = String.fromCharCode(65 + idColIndex); 
    
    // 2. Fetch that column
    const dataUrl = `${BASE_URL_SHEETS}/${spreadsheetId}/values/${colLetter}:${colLetter}?majorDimension=COLUMNS`;
    const dataRes = await authenticatedFetch(dataUrl);
    
    if (!dataRes.ok) return new Set();
    
    const colData = await dataRes.json();
    const ids = colData.values?.[0] || [];
    
    return new Set(ids);
  } catch (e) {
    console.warn('Failed to fetch existing IDs for deduplication', e);
    return new Set();
  }
};

// --- Main Export Function ---

export const ensureSheetExists = async (t: (key: string) => string) => {
  const appName = 'Receipts Register';
  // Use a fixed key or pass translation for 'Receipts'
  const receiptsLabel = t('receipts.title') || 'Receipts'; 
  const filename = `${appName} - ${receiptsLabel}`;

  let spreadsheetId = await findSheet(filename);
  if (!spreadsheetId) {
    spreadsheetId = await createSpreadsheet(filename);
    await appendHeaders(spreadsheetId, t);
  }
  return spreadsheetId;
};

export const connectToGoogleSheets = async (userId: string, t: (key: string) => string): Promise<string> => {
     // Trigger auth flow
     await getAccessToken();
     
     // Ensure sheet exists
     const id = await ensureSheetExists(t);
     
     // Persist ID
     if (id) {
         localStorage.setItem(`google_sheet_id_${userId}`, id);
         return id;
     }

     throw new Error('Failed to create or find Google Sheet');
};

export const syncReceiptsToSheet = async (receipts: Receipt[], lastSyncDate: string | null, t: (key: string) => string) => {
  const appName = 'Receipts Register';
  const receiptsLabel = t('receipts.title') || 'Receipts';
  const filename = `${appName} - ${receiptsLabel}`;

  // 1. Find or Create
  let spreadsheetId = await findSheet(filename);
  const isNewFile = !spreadsheetId;

  if (!spreadsheetId) {
    spreadsheetId = await createSpreadsheet(filename);
  }

  if (isNewFile && spreadsheetId) {
    await appendHeaders(spreadsheetId, t);
  }

  // 2. Filter Logic (Deduplication)
  let receiptsToExport = receipts;
  
  if (spreadsheetId) {
      const existingIds = await getExistingReceiptIds(spreadsheetId);
      
      if (existingIds.size > 0) {
          receiptsToExport = receipts.filter(r => !existingIds.has(r.id));
      } else if (!isNewFile && lastSyncDate) {
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

  // 3. Append Data
  if (spreadsheetId) {
    await appendRows(spreadsheetId, receiptsToExport);
    
    return {
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      spreadsheetId,
      timestamp: new Date().toISOString(),
      syncedCount: receiptsToExport.length
    };
  }

  throw new Error('Failed to identify spreadsheet ID');
};
