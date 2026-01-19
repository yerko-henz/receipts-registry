import { supabase } from '../lib/supabase';
import { Database } from '../lib/types';

export type ReceiptItem = Database['public']['Tables']['receipt_items']['Row'];

export const getReceiptItems = async (receiptId: string) => {
  const { data, error } = await supabase
    .from('receipt_items')
    .select('*')
    .eq('receipt_id', receiptId);

  if (error) throw error;
  return data;
};

export const deleteReceiptItem = async (id: number) => {
  const { error } = await supabase
    .from('receipt_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
