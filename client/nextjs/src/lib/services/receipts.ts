import { createSPAClient } from '@/lib/supabase/client';
import { startOfDay, endOfDay, parseISO, subDays } from 'date-fns';
import { ReceiptCategory } from '@/constants/categories';

// Define Database types locally or import if available. 
// Mirroring mobile app structure for consistency.

export type Receipt = {
  id: string;
  created_at: string;
  transaction_date: string | null;
  merchant_name: string;
  total_amount: number;
  currency: string;
  category: string;
  tax_amount?: number;
  image_url?: string;
  user_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  receipt_items?: any[]; 
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
  const startDate = subDays(new Date(), days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDateStr) 
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) throw error;
  
  // Note: We don't sign images here to keep it lighter/faster for chart usage, matching mobile app
  return data as Receipt[];
};

export type ReceiptFilters = {
    category?: string;
    searchQuery?: string;
    startDate?: string;
    endDate?: string;
    dateMode?: 'transaction' | 'created';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
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
      
      if (filters.dateMode === 'created') {
        const start = startOfDay(parseISO(filters.startDate));
        query = query.gte(dateColumn, start.toISOString());

        const endToken = filters.endDate || filters.startDate;
        const end = endOfDay(parseISO(endToken));
        query = query.lte(dateColumn, end.toISOString());
      } else {
        // Transaction date is likely a DATE column (YYYY-MM-DD) or timestamptz. 
        // Mobile app converts to ISO string start of day.
        
        const start = startOfDay(parseISO(filters.startDate));
        query = query.gte(dateColumn, start.toISOString());

        const endToken = filters.endDate || filters.startDate;
        const end = endOfDay(parseISO(endToken));
        query = query.lte(dateColumn, end.toISOString());
      }
  }

  let orderBy = filters?.dateMode === 'created' ? 'created_at' : 'transaction_date';
  let ascending = false;

  if (filters?.sortBy) {
      orderBy = filters.sortBy;
      if (filters.sortOrder === 'asc') {
          ascending = true;
      }
  }
  
  query = query
    .order(orderBy, { ascending })
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

export const getAllReceiptsForSync = async (userId: string) => {
  const supabase = createSPAClient();
  
  const { data, error } = await supabase
    .from('receipts')
    .select('*, receipt_items(*)')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false });

  if (error) throw error;

  // We DO sign images here because the sheet sync needs signed URLs
  const signedData = await signReceiptImages(data as Receipt[]);
  return signedData;
};

export const createReceipt = async (params: NewReceiptWithItems) => {
  const supabase = createSPAClient();
  
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
    
    const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(data.path);
    return publicUrlData.publicUrl;
};
