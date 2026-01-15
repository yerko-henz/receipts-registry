import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AnalysisState } from './types';
import { AlertCircle, Calendar, Download, Save } from 'lucide-react-native';

export const ReceiptAnalyzer: React.FC<AnalysisState> = ({ isLoading, error, data }) => {
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorHeader}>
          <AlertCircle size={24} color="#b91c1c" />
          <Text style={styles.errorTitle}>Analysis Failed</Text>
        </View>
        <Text style={styles.errorMessage}>{error}</Text>
        {/* Note: Reload logic depends on parent, omitting generic reload for now or keeping a retry button if parent passes a handler */}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={[styles.skeletonLine, { width: '50%', height: 32, marginBottom: 24 }]} />
        <View style={styles.skeletonGroup}>
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: '75%' }]} />
        </View>
        <View style={styles.skeletonFooter}>
          <View style={[styles.skeletonLine, { width: 80 }]} />
          <View style={[styles.skeletonLine, { width: 64 }]} />
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
    <View style={styles.container}>
      {/* Merchant Header */}
      <View style={styles.header}>
        <View style={styles.merchantRow}>
          <Text style={styles.merchantName}>{data.merchantName}</Text>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>
        <View style={styles.dateRow}>
          <Calendar size={16} color="#64748b" />
          <Text style={styles.dateText}>{data.date || 'Date not detected'}</Text>
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colPrice}>Price</Text>
        </View>
        <View>
          {data.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <View style={styles.colDesc}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.pricePerUnit && (
                  <Text style={styles.itemUnitPrice}>
                    @ {formatCurrency(item.pricePerUnit)} / unit
                  </Text>
                )}
              </View>
              <Text style={styles.colPrice}>{formatCurrency(item.totalPrice)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Summary Section */}
      <View style={styles.summaryContainer}>
        {data.subtotal > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(data.subtotal)}</Text>
          </View>
        )}
        
        {data.tax && (
          <View style={styles.summaryRow}>
            <View style={styles.taxLabelRow}>
              <Text style={styles.summaryLabel}>{data.tax.type}</Text>
              {data.tax.percentage && (
                <View style={styles.taxBadge}>
                  <Text style={styles.taxBadgeText}>{data.tax.percentage}%</Text>
                </View>
              )}
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(data.tax.amount)}</Text>
          </View>
        )}

        {data.discounts > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.discountText]}>Discounts</Text>
            <Text style={[styles.summaryValue, styles.discountText]}>-{formatCurrency(data.discounts)}</Text>
          </View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>{formatCurrency(data.total)}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButtonSecondary}>
          <Download size={20} color="#334155" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonTextSecondary}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonPrimary}>
          <Save size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonTextPrimary}>Save Record</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#f8fafc',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
});
