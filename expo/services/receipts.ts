import { supabase, uploadFile } from '../lib/supabase';
import { Database } from '../lib/types';
import { ReceiptData } from '@/components/receiptAnalizer/types';
import { isIntegrityAcceptable } from './receiptIntegrity';

export type Receipt = Database['public']['Tables']['receipts']['Row'];
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

export const getReceipts = async () => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .order('transaction_date', { ascending: false });

  if (error) throw error;
  return data;
};

export const getReceiptsByUserId = async (userId: string) => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false });

  if (error) throw error;
  return data;
};

export const getReceiptById = async (id: string) => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*, receipt_items(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
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
