'use client';

import { createSPASassClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SSOButtons from '@/components/SSOButtons';
import { useTranslations } from 'next-intl';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth.register');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(tAuth('error.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      const supabase = await createSPASassClient();
      const { error } = await supabase.registerEmail(email, password);

      if (error) throw error;

      // Don't setLoading(false) on success — keeps the spinner active
      // while Next.js navigates to the verify-email page.
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: Error | unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(tAuth('error.unknown'));
      }
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border dark:border-zinc-800">
      {error && <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-lg">{error}</div>}

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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full appearance-none rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-primary-500 dark:focus:ring-primary-400 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
            {tCommon('confirmPassword')}
          </label>
          <div className="mt-1">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full appearance-none rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-primary-500 dark:focus:ring-primary-400 dark:text-white"
            />
          </div>
        </div>

        {/* Checkbox removed as per user request */}

        <div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? tAuth('button.creatingAccount') : tCommon('createAccount')}
          </button>
        </div>
      </form>

      <SSOButtons onError={setError} />

      <div className="mt-6 text-center text-sm">
        <span className="text-gray-600 dark:text-zinc-400">{tCommon('alreadyHaveAccount')}</span>{' '}
        <Link href="/auth/login" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500">
          {tCommon('signIn')}
        </Link>
      </div>
    </div>
  );
}
