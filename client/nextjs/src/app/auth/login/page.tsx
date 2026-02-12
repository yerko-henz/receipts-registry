// src/app/auth/login/page.tsx
'use client';

import { createSPASassClient } from '@/lib/supabase/client';
import {useEffect, useState} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SSOButtons from '@/components/SSOButtons';
import { useTranslations } from 'next-intl';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showMFAPrompt, setShowMFAPrompt] = useState(false);
    const router = useRouter();
    const tCommon = useTranslations('common');
    const tAuth = useTranslations('auth.login');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const client = await createSPASassClient();
            const { error: signInError } = await client.loginEmail(email, password);

            if (signInError) throw signInError;

            // Check if MFA is required
            const supabase = client.getSupabaseClient();
            const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

            if (mfaError) throw mfaError;

            if (mfaData.nextLevel === 'aal2' && mfaData.nextLevel !== mfaData.currentLevel) {
                setShowMFAPrompt(true);
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                router.push('/dashboard');
                return;
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(tAuth('error.unknown'));
            }
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if(showMFAPrompt) {
            router.push('/auth/2fa');
        }
    }, [showMFAPrompt, router]);


    return (
        <div className="bg-white dark:bg-zinc-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border dark:border-zinc-800">
            {error && (
                <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                        {tCommon('email')}
                    </label>
                    <div className="mt-1">
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full appearance-none rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-primary-500 dark:focus:ring-primary-400 dark:text-white"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                        {tCommon('password')}
                    </label>
                    <div className="mt-1">
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full appearance-none rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-primary-500 dark:focus:ring-primary-400 dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-sm">
                        <Link href="/auth/forgot-password" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500">
                            {tCommon('forgotYourPassword')}
                        </Link>
                    </div>
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                        {loading ? tAuth('button.signingIn') : tCommon('signIn')}
                    </button>
                </div>
            </form>

            <SSOButtons onError={setError} showDisclaimer={false} />

            <div className="mt-6 text-center text-sm">
                <span className="text-gray-600 dark:text-zinc-400">{tCommon('dontHaveAccount')}</span>
                {' '}
                <Link href="/auth/register" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500">
                    {tCommon('signUp')}
                </Link>
            </div>
        </div>
    );
}