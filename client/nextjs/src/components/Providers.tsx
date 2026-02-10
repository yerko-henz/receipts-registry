"use client";

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalProvider } from '@/lib/context/GlobalContext';

interface ProvidersProps {
  children: React.ReactNode;
  initialUser: any;
}

export function Providers({ children, initialUser }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalProvider initialUser={initialUser}>
        {children}
      </GlobalProvider>
    </QueryClientProvider>
  );
}
