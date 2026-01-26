import { Utensils, Car, Zap, Film, ShoppingBag, FileText, LucideIcon } from 'lucide-react-native';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Food: Utensils,
  Transport: Car,
  Utilities: Zap,
  Entertainment: Film,
  Shopping: ShoppingBag,
  Other: FileText,
};

export const DEFAULT_CATEGORY_ICON = FileText;
