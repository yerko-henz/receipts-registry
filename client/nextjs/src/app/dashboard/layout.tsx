import AppLayout from '@/components/AppLayout';
import { Providers } from '@/components/Providers';
import { createSSRClient } from '@/lib/supabase/server';

export default async function Layout({ children }: { children: React.ReactNode }) {
    const supabase = await createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <Providers initialUser={user}>
            <AppLayout>{children}</AppLayout>
        </Providers>
    );
}