import { createSPAClient } from '@/lib/supabase/client';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { ReceiptCategory } from '@/constants/categories';

// Define Database types locally or import if available. 
// Assuming Database type is not fully available or compatible, we define Receipt loosely or try to import.
// Removed unused import
// If Database is not exported from types, we might need to redefine.
// Checking client/nextjs/src/lib/types.ts content would be good, but for now I'll use 'any' fallback for complex types
// and specific fields for what we need.

export type Receipt = {
  id: string;
  created_at: string;
  transaction_date: string;
  merchant_name: string;
  total_amount: number;
  currency: string;
  category: string;
  tax_amount?: number;
  image_url?: string;
  user_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  receipt_items?: any[]; // Simplified
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw_ai_output?: any;
};

export type NewReceiptWithItems = {
  merchant_name: string;
  total: number;
  currency: string;
  date: string;
  category: ReceiptCategory;
  tax_amount: number;
  image_url?: string;
  raw_ai_output: unknown;
  items: {
    name: string;
    totalPrice: number;
    unitPrice: number;
    quantity: number;
  }[];
};

const signReceiptImages = async (receipts: Receipt[]) => {
  if (receipts.length === 0) return receipts;
  const supabase = createSPAClient();

  const pathsToSign: { path: string; receiptIndex: number }[] = [];
  
  receipts.forEach((r, index) => {
      if (!r.image_url) return;
      
      let path = r.image_url;
      const match = path.match(/\/receipts\/(.+)$/);
      if (match && match[1]) {
          path = match[1];
      }
      
      pathsToSign.push({ path, receiptIndex: index });
  });

  if (pathsToSign.length === 0) return receipts;

  const { data, error } = await supabase
      .storage
      .from('receipts')
      .createSignedUrls(pathsToSign.map(p => p.path), 60 * 60);

  if (error || !data) {
      console.error('Error signing URLs:', error);
      return receipts; 
  }

  const newReceipts = [...receipts];
  
  data.forEach((item, i) => {
      if (item.signedUrl) {
          const receiptIndex = pathsToSign[i].receiptIndex;
          newReceipts[receiptIndex] = {
              ...newReceipts[receiptIndex],
              image_url: item.signedUrl
          };
      }
  });

  return newReceipts;
}

export const getRecentReceipts = async (userId: string, days: number = 7) => {
  const supabase = createSPAClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDateStr) 
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data as Receipt[];
};

export type ReceiptFilters = {
    category?: string;
    searchQuery?: string;
    startDate?: string;
    endDate?: string;
    dateMode?: 'transaction' | 'created';
};

export const getReceiptsByUserId = async (
    userId: string, 
    page: number = 1, 
    pageSize: number = 20,
    filters?: ReceiptFilters
) => {
  const supabase = createSPAClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('receipts')
    .select('*, receipt_items(*)', { count: 'exact' })
    .eq('user_id', userId);

  if (filters?.category && filters.category !== 'All') {
      query = query.eq('category', filters.category);
  }

  if (filters?.searchQuery) {
      query = query.ilike('merchant_name', `%${filters.searchQuery}%`);
  }

  if (filters?.startDate) {
      const dateColumn = filters.dateMode === 'created' ? 'created_at' : 'transaction_date';
      const start = startOfDay(parseISO(filters.startDate));
      query = query.gte(dateColumn, start.toISOString());

      const endToken = filters.endDate || filters.startDate;
      const end = endOfDay(parseISO(endToken));
      query = query.lte(dateColumn, end.toISOString());
  }

  const orderBy = filters?.dateMode === 'created' ? 'created_at' : 'transaction_date';
  
  query = query
    .order(orderBy, { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;
  
  const signedData = await signReceiptImages(data as Receipt[]);
  return { 
      data: signedData, 
      count: count,
      page,
      pageSize,
      hasMore: (count || 0) > to + 1
  };
};

export const createReceipt = async (params: NewReceiptWithItems) => {
  const supabase = createSPAClient();
  // Check integrity if passed (handled in Analyze page usually, but good to have here if we want)
  // For web, we assume integrity checked before calling this or valid data.

  // Handle image upload if provided (local file object handling happens in UI usually)
  // Here params.image_url is expected to be a signed URL or path if already uploaded, 
  // OR we upload it here if it's a File object?
  // Since we are invalidating the previous mobile logic of "file://", we expect the Caller to handle upload 
  // OR we accept a File object in params.
  // But NewReceiptWithItems has image_url: string.
  // So the UI should upload first.
  
  // @ts-expect-error: RPC types might be missing in generated types
  const { error } = await supabase.rpc('save_receipt_with_items', {
    p_merchant_name: params.merchant_name,
    p_total: params.total,
    p_currency: params.currency,
    p_date: params.date,
    p_category: params.category,
    p_tax_amount: params.tax_amount,
    p_image_url: params.image_url,
    p_raw_ai_output: params.raw_ai_output,
    p_items: params.items,
  });

  if (error) throw error;
};

export const uploadReceiptImage = async (file: File) => {
    const supabase = createSPAClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
  
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const { data, error } = await supabase.storage
        .from('receipts')
        .upload(`${user.id}/${filename}`, file);
  
    if (error) throw error;
    
    // Get public URL? But the mobile app uses Signed URLs usually or just path.
    // The mobile service returned `publicUrlData.publicUrl`.
    // But mobile `uploadReceiptImage` uploaded to `${user.id}/${filename}`.
    // And returned public URL.
    // But `save_receipt_with_items` stores it.
    // If bucket is private, we should store path.
    // Mobile `uploadReceiptImage` returns publicUrl.
    // Let's stick to returning path or public URL.
    // Mobile: `const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(data.path);`
    // I'll replicate that.
    
    const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(data.path);
    return publicUrlData.publicUrl;
};
