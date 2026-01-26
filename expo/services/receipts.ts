import { supabase, uploadFile } from '../lib/supabase';
import { Database } from '../lib/types';
import { ReceiptData } from '@/components/receiptAnalizer/types';
import { isIntegrityAcceptable } from './receiptIntegrity';

export type Receipt = Database['public']['Tables']['receipts']['Row'] & {
  receipt_items?: Database['public']['Tables']['receipt_items']['Row'][];
};
export type NewReceiptWithItems = {
  merchant_name: string;
  total: number;
  currency: string;
  date: string;
  category: string;
  tax_amount: number;
  image_url?: string;
  raw_ai_output: any;
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

export const getReceiptsByUserId = async (userId: string) => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*, receipt_items(*)')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false });

  if (error) throw error;
  return signReceiptImages(data);
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

export const createReceipt = async (params: NewReceiptWithItems) => {
  // Check integrity before saving
  if (params.raw_ai_output?.integrityScore !== undefined) {
    if (!isIntegrityAcceptable(params.raw_ai_output.integrityScore)) {
      throw new Error(`Cannot save: Receipt integrity score (${params.raw_ai_output.integrityScore}) is below acceptable threshold.`);
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
    p_raw_ai_output: params.raw_ai_output,
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

  const { error } = await supabase.rpc('batch_save_receipts', {
    p_receipts: receiptsToSave as any,
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
