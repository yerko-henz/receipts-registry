import { ViewStyle } from 'react-native';

/**
 * Common styles and helpers to maintain visual consistency across the app.
 */
export const CommonStyles = {
  /**
   * Standard card style matching the receipts list.
   * @param colors Theme colors object (Colors.light or Colors.dark)
   * @returns ViewStyle
   */
  /**
   * Flat card style matching the receipts list (no padding).
   */
  getFlatCardStyle: (colors: any): ViewStyle => ({
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 5,
  }),

  /**
   * Standard card style with padding and margin.
   */
  getCardStyle: (colors: any): ViewStyle => ({
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: 16,
    marginBottom: 8,
  }),
};
