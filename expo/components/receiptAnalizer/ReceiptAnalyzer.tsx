import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { AnalysisState } from './types';
import { AlertCircle, Calendar, Download, Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const ReceiptAnalyzer: React.FC<AnalysisState> = ({ isLoading, error, data, onSave }) => {
  const { activeTheme } = useTheme();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(true);

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };
  
  const dynamicStyles = StyleSheet.create({
    errorContainer: {
        backgroundColor: activeTheme === 'dark' ? '#2d1a1a' : '#fef2f2',
        borderColor: activeTheme === 'dark' ? '#b91c1c' : '#fee2e2',
    },
    errorTitle: {
        color: activeTheme === 'dark' ? '#fca5a5' : '#b91c1c',
    },
    errorMessage: {
        color: activeTheme === 'dark' ? '#fca5a5' : '#b91c1c',
    },
    loadingContainer: {
        backgroundColor: themeColors.card,
        borderColor: themeColors.border,
    },
    skeletonLine: {
        backgroundColor: activeTheme === 'dark' ? '#333' : '#e2e8f0',
    },
    container: {
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
    },
    header: {
      backgroundColor: activeTheme === 'dark' ? '#1f1f1f' : '#f8fafc',
      borderBottomColor: themeColors.border,
    },
    merchantName: {
      color: themeColors.text,
    },
    dateText: {
      color: themeColors.icon,
    },
    tableHeader: {
        borderBottomColor: themeColors.border,
        backgroundColor: themeColors.card,
    },
    itemName: {
      color: themeColors.text,
    },
    summaryContainer: {
      backgroundColor: activeTheme === 'dark' ? '#1f1f1f' : '#f8fafc',
    },
    totalLabel: {
      color: themeColors.text,
    },
    totalRow: {
        borderTopColor: themeColors.border,
    },
    actionButtonTextSecondary: {
        color: themeColors.text,
    },
    actionButtonSecondary: {
        backgroundColor: activeTheme === 'dark' ? '#333' : '#f1f5f9',
    },
    tableRow: {
        borderBottomColor: activeTheme === 'dark' ? '#333' : '#f8fafc',
    },
    verifiedBadge: {
        backgroundColor: activeTheme === 'dark' ? '#333' : '#e0e7ff',
    },
    verifiedText: {
        color: activeTheme === 'dark' ? themeColors.tint : '#4338ca',
    },
    colLabel: {
        color: themeColors.icon,
    },
    colText: {
        color: themeColors.text,
    },
    itemUnitPrice: {
        color: themeColors.icon,
    },
    summaryLabel: {
        color: themeColors.text,
        opacity: 0.8,
    },
    summaryValue: {
        color: themeColors.text,
    },
    totalValue: {
        color: themeColors.tint,
    },
    actionsContainer: {
        backgroundColor: themeColors.card,
    }
  });

  if (error) {
    return (
      <View style={[styles.errorContainer, dynamicStyles.errorContainer]}>
        <View style={styles.errorHeader}>
          <AlertCircle size={24} color={activeTheme === 'dark' ? '#fca5a5' : '#b91c1c'} />
          <Text style={[styles.errorTitle, dynamicStyles.errorTitle]}>Analysis Failed</Text>
        </View>
        <Text style={[styles.errorMessage, dynamicStyles.errorMessage]}>{error}</Text>
        {/* Note: Reload logic depends on parent, omitting generic reload for now or keeping a retry button if parent passes a handler */}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.loadingContainer]}>
        <View style={[styles.skeletonLine, dynamicStyles.skeletonLine, { width: '50%', height: 32, marginBottom: 24 }]} />
        <View style={styles.skeletonGroup}>
          <View style={[styles.skeletonLine, dynamicStyles.skeletonLine]} />
          <View style={[styles.skeletonLine, dynamicStyles.skeletonLine, { width: '80%' }]} />
          <View style={[styles.skeletonLine, dynamicStyles.skeletonLine, { width: '90%' }]} />
        </View>
        <View style={[styles.skeletonFooter, { borderTopColor: themeColors.border }]}>
          <View style={[styles.skeletonLine, dynamicStyles.skeletonLine, { width: 100, marginBottom: 0 }]} />
          <View style={[styles.skeletonLine, dynamicStyles.skeletonLine, { width: 120, marginBottom: 0 }]} />
        </View>
      </View>
    );
  }

  if (!data) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency.replace(/[^A-Z]/g, '') || 'USD',
      currencyDisplay: 'narrowSymbol'
    }).format(val).replace('USD', '$');
  };


  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Merchant Header - Clickable for Accordion */}
      <TouchableOpacity 
        onPress={toggleAccordion} 
        style={[styles.header, dynamicStyles.header]}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
            <View style={{ flex: 1 }}>
                <View style={styles.merchantRow}>
                    <Text style={[styles.merchantName, dynamicStyles.merchantName]}>{data.merchantName}</Text>
                    <View style={[styles.verifiedBadge, dynamicStyles.verifiedBadge]}>
                        <Text style={[styles.verifiedText, dynamicStyles.verifiedText]}>Verified</Text>
                    </View>
                </View>
                <View style={styles.dateRow}>
                    <Calendar size={16} color={themeColors.icon} />
                    <Text style={[styles.dateText, dynamicStyles.dateText]}>{data.date || 'Date not detected'}</Text>
                </View>
            </View>
            <View style={styles.accordionIcon}>
                {isExpanded ? <ChevronUp size={24} color={themeColors.icon} /> : <ChevronDown size={24} color={themeColors.icon} />}
            </View>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <>
          {/* Items Table */}
          <View style={styles.tableContainer}>
            <View style={[styles.tableHeader, dynamicStyles.tableHeader]}>
              <Text style={[styles.colQty, dynamicStyles.colLabel]}>Qty</Text>
              <Text style={[styles.colDesc, dynamicStyles.colLabel]}>Description</Text>
              <Text style={[styles.colPrice, dynamicStyles.colLabel]}>Price</Text>
            </View>
            <View>
              {data.items.map((item, idx) => (
                <View key={idx} style={[styles.tableRow, dynamicStyles.tableRow]}>
                  <Text style={[styles.colQty, dynamicStyles.colText]}>{item.quantity}</Text>
                  <View style={styles.colDesc}>
                    <Text style={[styles.itemName, dynamicStyles.itemName]}>{item.name}</Text>
                    {item.unitPrice && item.unitPrice !== item.totalPrice && (
                      <Text style={[styles.itemUnitPrice, dynamicStyles.itemUnitPrice]}>
                        {formatCurrency(item.unitPrice)} ea.
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.colPrice, dynamicStyles.colText]}>{formatCurrency(item.totalPrice)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Summary Section */}
          <View style={[styles.summaryContainer, dynamicStyles.summaryContainer]}>
            {data.taxAmount !== undefined && (
              <View style={styles.summaryRow}>
                <View style={styles.taxLabelRow}>
                  <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Tax/IVA</Text>
                </View>
                <Text style={[styles.summaryValue, dynamicStyles.summaryValue]}>{formatCurrency(data.taxAmount)}</Text>
              </View>
            )}

            {data.discount !== undefined && data.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Discount</Text>
                <Text style={[styles.summaryValue, styles.discountText]}>-{formatCurrency(data.discount)}</Text>
              </View>
            )}

            <View style={[styles.totalRow, dynamicStyles.totalRow]}>
              <Text style={[styles.totalLabel, dynamicStyles.totalLabel]}>Total Amount</Text>
              <Text style={[styles.totalValue, dynamicStyles.totalValue]}>{formatCurrency(data.total)}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={[styles.actionsContainer, dynamicStyles.actionsContainer]}>
            <TouchableOpacity style={[styles.actionButtonSecondary, dynamicStyles.actionButtonSecondary]}>
              <Download size={20} color={themeColors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.actionButtonTextSecondary, dynamicStyles.actionButtonTextSecondary]}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButtonPrimary, isSaving && styles.actionButtonDisabled]}
              onPress={async () => {
                if (onSave && data && !isSaving) {
                  setIsSaving(true);
                  try {
                    await onSave(data);
                  } finally {
                    setIsSaving(false);
                  }
                }
              }}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 size={20} color="#ffffff" style={{ marginRight: 8 }} />
              ) : (
                <Save size={20} color="#ffffff" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.actionButtonTextPrimary}>
                {isSaving ? 'Saving...' : 'Save Record'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Error State
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
    borderWidth: 1,
    padding: 24,
    borderRadius: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b91c1c',
  },
  errorMessage: {
    fontSize: 14,
    color: '#b91c1c',
    opacity: 0.9,
  },

  // Loading State
  loadingContainer: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  skeletonLine: {
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    height: 16,
    marginBottom: 16,
  },
  skeletonGroup: {
    gap: 16,
  },
  skeletonFooter: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Main Container
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  // Header
  header: {
    padding: 24,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accordionIcon: {
    marginLeft: 16,
  },
  merchantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  merchantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  verifiedBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  verifiedText: {
    color: '#4338ca',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    color: '#64748b',
    fontSize: 14,
  },

  // Table
  tableContainer: {
    padding: 0, 
    // sm:p-6 equivalent handled by padding in child views or container if needed, sticking to design
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  colQty: {
    width: 48,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  colDesc: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  colPrice: {
    width: 80,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  itemUnitPrice: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },

  // Summary
  summaryContainer: {
    backgroundColor: '#f8fafc',
    padding: 24,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  taxLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taxBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taxBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
  },
  discountText: {
    color: '#059669',
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900', // black
    color: '#4f46e5',
  },

  // Actions
  actionsContainer: {
    padding: 24,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonTextSecondary: {
    color: '#334155',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonTextPrimary: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#94a3b8',
  },
});
