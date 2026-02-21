'use client';

import { Mail } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createSPASassClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('auth.verifyEmail');
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleVerify = async (verifyCode: string) => {
    setError('');
    setLoading(true);
    try {
      const supabase = await createSPASassClient();
      const { error: verifyError } = await supabase.verifyOtp(email, verifyCode);
      if (verifyError) {
        setError(verifyError.message);
      } else {
        router.push('/dashboard');
      }
    } catch (err: Error | unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('error.unknown'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(newCode);
    // Auto-submit on 6th digit
    if (newCode.length === 6) {
      handleVerify(newCode);
    }
  };

  const handleResend = async () => {
    if (resendLoading) return;
    if (!email) {
      setError(t('error.noEmail'));
      return;
    }
    setError('');
    setResendSuccess(false);
    setResendLoading(true);
    try {
      const supabase = await createSPASassClient();
      const { error: resendError } = await supabase.resendVerificationEmail(email);
      if (resendError) {
        setError(resendError.message);
      } else {
        setResendSuccess(true);
        setCode('');
      }
    } catch (err: Error | unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('error.resendFailed'));
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border dark:border-zinc-800">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Mail className="h-16 w-16 text-primary-500" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('title')}</h2>

        <p className="text-gray-600 dark:text-zinc-400 mb-8">{email ? t('description', { email }) : t('descriptionFallback')}</p>

        <div className="space-y-4">
          {error && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-md p-3">{error}</div>}

          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              placeholder={t('codePlaceholder')}
              disabled={loading}
              autoFocus
              className="block w-full text-center text-2xl tracking-widest appearance-none rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-4 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-primary-500 dark:focus:ring-primary-400 dark:text-white disabled:opacity-50"
            />
          </div>

          <button
            onClick={() => handleVerify(code)}
            disabled={loading || code.length < 6}
            className="flex w-full justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? t('verifyingButton') : t('verifyButton')}
          </button>

          {resendSuccess && <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-md p-3">{t('resendSuccess')}</div>}

          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {t('resendPrompt')}{' '}
            <button onClick={handleResend} disabled={resendLoading} className="text-primary-600 dark:text-primary-400 hover:text-primary-500 font-medium disabled:opacity-50">
              {resendLoading ? t('resendingButton') : t('resendButton')}
            </button>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-zinc-700">
          <Link href="/auth/login" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500">
            {t('returnToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  const t = useTranslations('auth.verifyEmail');
  return (
    <Suspense fallback={<div className="bg-white dark:bg-zinc-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border dark:border-zinc-800 text-center text-gray-500 dark:text-zinc-400">{t('loading')}</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
