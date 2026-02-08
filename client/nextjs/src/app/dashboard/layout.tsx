// src/app/dashboard/layout.tsx
"use client";
import AppLayout from '@/components/AppLayout';
import { GlobalProvider } from '@/lib/context/GlobalContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <GlobalProvider>
                <AppLayout>{children}</AppLayout>
            </GlobalProvider>
        </QueryClientProvider>
    );
}