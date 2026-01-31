import { supabase, uploadFile } from '../lib/supabase';
import { Database } from '../lib/types';
import { ReceiptData } from '@/components/receiptAnalizer/types';
import { ReceiptCategory } from '@/constants/categories';
import { isIntegrityAcceptable } from './receiptIntegrity';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export type Receipt = Database['public']['Tables']['receipts']['Row'] & {
  receipt_items?: Database['public']['Tables']['receipt_items']['Row'][];
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

export const uploadReceiptImage = async (uri: string) => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('User not authenticated');

  const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
  const { data, error } = await uploadFile(user.id, filename, uri, 'image/jpeg', 'receipts');

  if (error) throw error;
  
  // Construct public URL or path. Since the buckets are usually private or we want the path 
  // expected by the app, we return the path relative to the bucket or full public URL.
  // The SQL implies it just stores a text string. Storing the full public URL is usually safest for display.
  // However, uploadFile returns Key (path).
  // Let's get the public URL.
  const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(data.path);
  return publicUrlData.publicUrl;
};

export const signReceiptImages = async (receipts: Receipt[]) => {
  if (receipts.length === 0) return receipts;

  // 1. Extract valid paths from image_url
  // Expecting URL like: specified_supabase_url/storage/v1/object/public/receipts/USER_ID/FILENAME
  // OR already a path: USER_ID/FILENAME
  const pathsToSign: { path: string; receiptIndex: number }[] = [];
  
  receipts.forEach((r, index) => {
      if (!r.image_url) return;
      
      let path = r.image_url;
      // If it contains the full supabase URL, try to extract relative path
      // This regex looks for /receipts/ and takes everything after
      const match = path.match(/\/receipts\/(.+)$/);
      if (match && match[1]) {
          path = match[1];
      }
      
      // If it's already a relative path (doesn't start with http), usage is fine
      // But verify it doesn't have leading slash if supabase doesn't like it.
      // Usually storage.from('receipts').createSignedUrls expects "folder/file.ext"
      
      pathsToSign.push({ path, receiptIndex: index });
  });

  if (pathsToSign.length === 0) return receipts;

  // 2. Batch create signed URLs (expires in 1 hour usually enough for session)
  // supabase.storage.createSignedUrls takes array of paths
  const { data, error } = await supabase
      .storage
      .from('receipts')
      .createSignedUrls(pathsToSign.map(p => p.path), 60 * 60);

  if (error || !data) {
      console.error('Error signing URLs:', error);
      return receipts; // Return original URLs as fallback
  }

  // 3. Map back to receipts
  // data is array of { error: string|null, path: string, signedUrl: string }
  // Order should match input array
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

export const getReceipts = async () => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*, receipt_items(*)')
    .order('transaction_date', { ascending: false });

  if (error) throw error;
  return signReceiptImages(data);
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
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  console.log(`[getReceiptsByUserId] Fetching page ${page} for user ${userId} with filters:`, JSON.stringify(filters));

  let query = supabase
    .from('receipts')
    .select('*, receipt_items(*)', { count: 'exact' })
    .eq('user_id', userId);

  // 1. Category Filter
  if (filters?.category && filters.category !== 'All') {
      query = query.eq('category', filters.category);
  }

  // 2. Search Filter (Merchant Name)
  if (filters?.searchQuery) {
      query = query.ilike('merchant_name', `%${filters.searchQuery}%`);
  }

  // 3. Date Filter
  if (filters?.startDate) {
      const dateColumn = filters.dateMode === 'created' ? 'created_at' : 'transaction_date';
      
      // Convert local YYYY-MM-DD string to specific UTC timestamps
      // parseISO interprets YYYY-MM-DD as local start of day by default in date-fns context (usually)
      // verify input format is YYYY-MM-DD
      
      const start = startOfDay(parseISO(filters.startDate));
      query = query.gte(dateColumn, start.toISOString());

      if (filters.endDate) {
           const end = endOfDay(parseISO(filters.endDate));
           query = query.lte(dateColumn, end.toISOString());
      } else {
           // If only start date is provided, assume single day selection?
           // Or assume "From this date"? 
           // Usually date pickers imply a range or single point. 
           // If UI sends only startDate, we treat it as THAT DAY only (common receipt filter pattern)
           // OR "From X onwards". 
           // Let's assume strict single day if endDate is missing, to match expected "Filter by Date" behavior.
           const end = endOfDay(parseISO(filters.startDate));
           query = query.lte(dateColumn, end.toISOString());
      }
  }

  const orderBy = filters?.dateMode === 'created' ? 'created_at' : 'transaction_date';
  
  // Apply sorting and pagination
  query = query
    .order(orderBy, { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;
  
  const signedData = await signReceiptImages(data);
  return { 
      data: signedData, 
      count: count,
      page,
      pageSize,
      hasMore: (count || 0) > to + 1
  };
};

export const getReceiptById = async (id: string) => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*, receipt_items(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  
  // Sign the single receipt
  const signed = await signReceiptImages([data]);
  return signed[0];
};

export const getRecentReceipts = async (userId: string, days: number = 7) => {
  // Calculates start date for filtering
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDateStr) // Using created_at since that's the current preference
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Note: We don't sign images here to keep it lighter/faster for chart usage
  return data;
};

export const createReceipt = async (params: NewReceiptWithItems) => {
  // Check integrity before saving
  const aiOutput = params.raw_ai_output as { integrityScore?: number } | null;
  if (aiOutput?.integrityScore !== undefined) {
    if (!isIntegrityAcceptable(aiOutput.integrityScore)) {
      throw new Error(`Cannot save: Receipt integrity score (${aiOutput.integrityScore}) is below acceptable threshold.`);
    }
  }

  // Handle image upload if provided
  let imageUrl = params.image_url;
  
  // NOTE: In single create, we expect params.image_url to be passed if it exists 
  // (e.g. if the caller already uploaded it). 
  // However, usually the UI passes the URI.
  // The type NewReceiptWithItems now has image_url. 
  // If the caller passed a local URI as image_url, we should upload it.
  if (imageUrl && (imageUrl.startsWith('file://') || imageUrl.startsWith('content://'))) {
      imageUrl = await uploadReceiptImage(imageUrl) || undefined;
  }

  const { error } = await supabase.rpc('save_receipt_with_items', {
    p_merchant_name: params.merchant_name,
    p_total: params.total,
    p_currency: params.currency,
    p_date: params.date,
    p_category: params.category,
    p_tax_amount: params.tax_amount,
    p_image_url: imageUrl,
    p_raw_ai_output: params.raw_ai_output as Database['public']['Tables']['receipts']['Row']['raw_ai_output'],
    p_items: params.items,
  });

  if (error) throw error;
};

export const createReceipts = async (receipts: ReceiptData[]) => {
  // Check integrity for all receipts in batch
  for (const receipt of receipts) {
    if (receipt.integrityScore !== undefined && !isIntegrityAcceptable(receipt.integrityScore)) {
      throw new Error(`Cannot save batch: One or more receipts have low integrity scores (e.g., ${receipt.merchantName}: ${receipt.integrityScore}).`);
    }
  }

  // Upload images for all receipts having imageUri
  const receiptsToSave = await Promise.all(receipts.map(async (r) => {
      let imageUrl = r.imageUri;
      if (imageUrl && (imageUrl.startsWith('file://') || imageUrl.startsWith('content://'))) {
          try {
             imageUrl = await uploadReceiptImage(imageUrl) || undefined;
          } catch (e) {
              console.error(`Failed to upload image for receipt ${r.merchantName}:`, e);
              // Proceed without image if upload fails? Or fail? 
              // Let's proceed without image to avoid blocking the whole batch, but log it.
              imageUrl = undefined;
          }
      }
      return {
          ...r,
          imageUrl: imageUrl
      };
  }));

  const { error } = await supabase.rpc('save_receipts_batch', {
    // @ts-ignore: Complex database type for array parameter
    p_receipts: receiptsToSave,
  });

  if (error) throw error;
};


export const deleteReceipt = async (id: string) => {
  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
