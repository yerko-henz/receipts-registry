import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/components/ThemeProvider';

interface MerchantHeaderProps {
  merchantName: string;
  date?: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export const MerchantHeader: React.FC<MerchantHeaderProps> = ({ 
  merchantName, 
  date, 
  isExpanded, 
  onToggle 
}) => {
  const { activeTheme } = useTheme();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const dynamicStyles = StyleSheet.create({
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
    verifiedBadge: {
      backgroundColor: activeTheme === 'dark' ? '#333' : '#e0e7ff',
    },
    verifiedText: {
      color: activeTheme === 'dark' ? themeColors.tint : '#4338ca',
    },
  });

  return (
    <TouchableOpacity 
      onPress={onToggle} 
      style={[styles.header, dynamicStyles.header]}
      activeOpacity={0.7}
    >
      <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
              <View style={styles.merchantRow}>
                  <Text style={[styles.merchantName, dynamicStyles.merchantName]}>{merchantName}</Text>
                  <View style={[styles.verifiedBadge, dynamicStyles.verifiedBadge]}>
                      <Text style={[styles.verifiedText, dynamicStyles.verifiedText]}>Verified</Text>
                  </View>
              </View>
              <View style={styles.dateRow}>
                  <Calendar size={16} color={themeColors.icon} />
                  <Text style={[styles.dateText, dynamicStyles.dateText]}>{date || 'Date not detected'}</Text>
              </View>
          </View>
          <View style={styles.accordionIcon}>
              {isExpanded ? <ChevronUp size={24} color={themeColors.icon} /> : <ChevronDown size={24} color={themeColors.icon} />}
          </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  verifiedText: {
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
    fontSize: 14,
  },
});
