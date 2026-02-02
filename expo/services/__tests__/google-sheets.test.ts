import { syncReceiptsToSheet } from '../google-sheets';
import { GoogleSignin } from '../../lib/google-signin';

// Mock Dependencies
jest.mock('../../lib/google-signin', () => ({
    GoogleSignin: {
        hasPreviousSignIn: jest.fn(),
        signIn: jest.fn(),
        getTokens: jest.fn(),
    }
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Fetch
global.fetch = jest.fn() as jest.Mock;

const mockT = ((key: string) => key) as any;

describe('syncReceiptsToSheet', () => {
    const mockAccessToken = 'mock-access-token';
    const mockReceipts = [
        { id: 'r1', transaction_date: '2023-01-01', merchant_name: 'Test Store', total_amount: 100, image_url: 'http://img.com', created_at: '2023-01-01T10:00:00Z' }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        if (GoogleSignin) {
            (GoogleSignin.hasPreviousSignIn as jest.Mock).mockReturnValue(true);
            (GoogleSignin.getTokens as jest.Mock).mockResolvedValue({ accessToken: mockAccessToken });
        }
    });

    it('should authenticate user if not signed in', async () => {
        if (!GoogleSignin) return; // Guard for TS
        (GoogleSignin.hasPreviousSignIn as jest.Mock).mockReturnValue(false);
        (GoogleSignin.getTokens as jest.Mock).mockResolvedValue({ accessToken: mockAccessToken });
        
        // Mock finding sheet (null) -> create -> append headers -> existing IDs -> append rows
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ files: [] }) // Find sheet returns empty
        });

        // We need to handle multiple fetch calls sequence
        // 1. Find Sheet (empty)
        // 2. Create Sheet
        // 3. Append Headers
        // 4. Get Header (for dedupe, optional flow but implemented)
        // 5. Append Rows
        
        // Let's simplify by using mockImplementationOnce for specific responses if logic gets complex.
        // For now, let's just ensure sign in is called.
        // We need at least basic fetch mocks to prevent crash
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ spreadsheetId: 'new-sheet-id', files: [] })
        });

        await syncReceiptsToSheet([], null, mockT);
        expect(GoogleSignin.signIn).toHaveBeenCalled();
    });

    it('should create new sheet if not found', async () => {
         // 1. Find Sheet -> Returns empty
         (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
            ok: true,
            json: async () => ({ files: [] })
         }));
         
         // 2. Create Sheet -> Returns ID
         (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
            ok: true,
            json: async () => ({ spreadsheetId: 'new-id' })
         }));

         // 3. Append Headers
         (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({ ok: true, json: async () => ({}) }));

         // 4. Get Existing IDs (Header check) -> Fail or empty
         (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({ ok: false })); 

         // 5. Append Rows
         (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({ ok: true, json: async () => ({}) }));

         const result = await syncReceiptsToSheet(mockReceipts as any[], null, mockT);
         
         expect(result.spreadsheetId).toBe('new-id');
         // Verify Create call
         expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body).properties.title).toContain('Receipts Register');
    });

    it('should append to existing sheet', async () => {
        // 1. Find Sheet -> Found
        (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
           ok: true,
           json: async () => ({ files: [{ id: 'existing-id' }] })
        }));
        
        // 2. Get Existing IDs (Header) -> Found
        (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
            ok: true,
            json: async () => ({ values: [['id']] }) // Header row
         }));
 
         // 3. Get Existing IDs (Column) -> Found IDs
         (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
            ok: true,
            json: async () => ({ values: [['old-r1']] }) // Existing ID 'old-r1'
         }));

        // 4. Append Rows
        (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({ ok: true, json: async () => ({}) }));

        const result = await syncReceiptsToSheet(mockReceipts as any[], null, mockT);
        
        expect(result.spreadsheetId).toBe('existing-id');
        expect(result.syncedCount).toBe(1);
   });

   it('should filter duplicates based on existing IDs', async () => {
        // 1. Find Sheet -> Found
        (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
            ok: true,
            json: async () => ({ files: [{ id: 'existing-id' }] })
        }));
        
        // 2. Get Existing IDs (Header)
        (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
            ok: true,
            json: async () => ({ values: [['id']] })
         }));
 
         // 3. Get Existing IDs (Column) -> Returns 'r1' (which is in our mockReceipts)
         (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
            ok: true,
            json: async () => ({ values: [['r1']] }) 
         }));

        // No append call expected if all filtered out
        
        const result = await syncReceiptsToSheet(mockReceipts as any[], null, mockT);
        
        expect(result.syncedCount).toBe(0);
   });
});
