"use client"

import { useState, useEffect } from "react";
import { DatePickerInput } from '@mantine/dates';
import { useTranslations } from "next-intl";
import { parseISO } from "date-fns";
import dayjs from "dayjs";
import 'dayjs/locale/es'; // Import Spanish locale just in case
import { ChevronDown } from "lucide-react";

interface DateRangeFilterProps {
  startDate: string | null
  endDate: string | null
  onRangeChange: (start: string | null, end: string | null) => void
  disabled?: boolean
}

export function DateRangeFilter({
  startDate,
  endDate,
  onRangeChange,
  disabled = false,
}: DateRangeFilterProps) {
  const t = useTranslations('dashboard.receipts.filters')
  
  // Internal state for Mantine (array of [Date | null, Date | null])
  const [value, setValue] = useState<[Date | null, Date | null]>([null, null]);

  useEffect(() => {
    if (startDate && endDate) {
        setValue([parseISO(startDate), parseISO(endDate)]);
    } else if (startDate) {
        setValue([parseISO(startDate), null]);
    } else {
        setValue([null, null]);
    }
  }, [startDate, endDate]);

  const handleChange = (val: any) => {
      // Check for null or undefined
      if (!val) {
          setValue([null, null]);
          onRangeChange(null, null);
          return;
      }
      
      // Ensure it's an array for range picker
      if (!Array.isArray(val)) {
          // If for some reason it's not an array (e.g. single date mode), handle gracefully or ignore
          console.warn("DateRangeFilter: Expected array but got", val);
          return;
      }

      setValue(val as [Date | null, Date | null]);
      const [start, end] = val;
      
      const formatToIso = (date: any) => {
          if (!date) return null;
          if (date instanceof Date) return date.toISOString();
          if (typeof date === 'string') {
              // Parse YYYY-MM-DD string as local date (midnight)
              // new Date('YYYY-MM-DD') parses as UTC midnight, which might be previous day in local time.
              // new Date(y, m, d) uses local time.
              const parts = date.split('-');
              if (parts.length === 3) {
                  const year = parseInt(parts[0], 10);
                  const month = parseInt(parts[1], 10) - 1;
                  const day = parseInt(parts[2], 10);
                  return new Date(year, month, day).toISOString();
              }
              // Fallback
              return new Date(date).toISOString();
          } 
          return null;
      };

      onRangeChange(
          formatToIso(start),
          formatToIso(end)
      );
  };

  return (
    <DatePickerInput
      type="range"
      placeholder={t('dateRange')}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      clearable
      style={{ width: 260 }}
      rightSection={<ChevronDown className="h-4 w-4 opacity-50" />}
      rightSectionWidth={28}
      rightSectionPointerEvents="none"
      locale="es" // Force Spanish for now or make dynamic based on context, but dayjs locale needs to be loaded
      valueFormat="MMM D, YYYY"
      styles={{
          input: {
              backgroundColor: 'hsl(var(--background))',
              borderColor: 'hsl(var(--input))', 
              borderWidth: '1px',
              borderStyle: 'solid',
              fontFamily: 'inherit',
              fontSize: '0.875rem', // text-sm
              lineHeight: '1.25rem',
              color: 'hsl(var(--foreground))',
              height: '2.5rem', // h-10
              borderRadius: 'calc(var(--radius) - 2px)',
          },
          placeholder: {
              color: 'hsl(var(--foreground))',
              opacity: 1,
          },

          calendarHeader: {
              color: 'hsl(var(--foreground))',
              maxWidth: '100%',
          },
          calendarHeaderLevel: {
              color: 'hsl(var(--foreground))',
          },
          weekdaysRow: {
              color: 'hsl(var(--muted-foreground))',
          },
          day: {
              color: 'hsl(var(--popover-foreground))', // Use popover foreground for days
              borderRadius: 'var(--radius)',
          }
      }}
      // Use classNames to integrate with Tailwind better if needed, 
      // but Mantine styles are isolated.
    />
  );
}
