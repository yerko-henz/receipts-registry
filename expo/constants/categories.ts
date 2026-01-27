import { Utensils, Car, Zap, Film, ShoppingBag, FileText, LucideIcon, HeartPulse } from 'lucide-react-native';

export const RECEIPT_CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Health',
  'Other',
] as const;

export type ReceiptCategory = typeof RECEIPT_CATEGORIES[number];

export const CATEGORY_ICONS: Record<ReceiptCategory, LucideIcon> = {
  Food: Utensils,
  Transport: Car,
  Utilities: Zap,
  Entertainment: Film,
  Shopping: ShoppingBag,
  Health: HeartPulse,
  Other: FileText,
};

export const DEFAULT_CATEGORY_ICON = FileText;

export const getCategoryIcon = (category: string): LucideIcon => {
  if (category in CATEGORY_ICONS) {
    return CATEGORY_ICONS[category as ReceiptCategory];
  }
  return DEFAULT_CATEGORY_ICON;
};
