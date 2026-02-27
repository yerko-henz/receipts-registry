import { Utensils, Car, Zap, Film, ShoppingBag, FileText, LucideIcon, HeartPulse, Fuel, ShoppingBasket } from 'lucide-react';

export const RECEIPT_CATEGORIES = ['Food', 'Dining', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Groceries', 'Gas', 'Health', 'Other'] as const;

export type ReceiptCategory = (typeof RECEIPT_CATEGORIES)[number];

export const CATEGORY_ICONS: Record<ReceiptCategory, LucideIcon> = {
  Food: Utensils,
  Dining: Utensils,
  Transport: Car,
  Utilities: Zap,
  Entertainment: Film,
  Shopping: ShoppingBag,
  Groceries: ShoppingBasket,
  Gas: Fuel,
  Health: HeartPulse,
  Other: FileText
};

export const CATEGORY_COLORS: Record<ReceiptCategory, string> = {
  Food: 'var(--color-category-food)',
  Dining: 'var(--color-category-dining)',
  Transport: 'var(--color-category-transport)',
  Utilities: 'var(--color-category-utilities)',
  Entertainment: 'var(--color-category-entertainment)',
  Shopping: 'var(--color-category-shopping)',
  Groceries: 'var(--color-category-groceries)',
  Gas: 'var(--color-category-gas)',
  Health: 'var(--color-category-health)',
  Other: 'var(--color-category-other)'
};

export const DEFAULT_CATEGORY_ICON = FileText;

export const getCategoryIcon = (category: string): LucideIcon => {
  if (category in CATEGORY_ICONS) {
    return CATEGORY_ICONS[category as ReceiptCategory];
  }
  return DEFAULT_CATEGORY_ICON;
};
