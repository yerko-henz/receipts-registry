import { supabase } from '../lib/supabase';
import { Database } from './database.types';
import { ReceiptData } from '@/components/receiptAnalizer/types';

export type Receipt = Database['public']['Tables']['receipts']['Row'];
export type NewReceiptWithItems = {
  merchant_name: string;
  total: number;
  currency: string;
  date: string;
  category: string;
  tax_amount: number;
  raw_ai_output: any;
  items: {
    name: string;
    totalPrice: number;
    unitPrice: number;
    quantity: number;
  }[];
};

export const getReceipts = async () => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
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
  const { error } = await supabase.rpc('save_receipt_with_items', {
    p_merchant_name: params.merchant_name,
    p_total: params.total,
    p_currency: params.currency,
    p_date: params.date,
    p_category: params.category,
    p_tax_amount: params.tax_amount,
    p_raw_ai_output: params.raw_ai_output,
    p_items: params.items,
  });

  if (error) throw error;
};

export const createReceipts = async (receipts: ReceiptData[]) => {
  const { error } = await supabase.rpc('save_receipts_batch', {
    p_receipts: receipts as any,
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
