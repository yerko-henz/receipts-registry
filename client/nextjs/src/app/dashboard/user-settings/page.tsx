'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGlobal } from '@/lib/context/GlobalContext';
import { createSPASassClientAuthenticated as createSPASassClient } from '@/lib/supabase/client';
import { Key, User, CheckCircle, FileSpreadsheet, Globe, MapPin, Palette, Mail, Loader2, Link as LinkIcon, Check, Trash2 } from 'lucide-react';
import { MFASetup } from '@/components/MFASetup';
import { useTranslations, useLocale } from 'next-intl';
import Script from 'next/script';
import { connectToGoogleSheets, initGoogleAuth } from '@/lib/services/google-sheets';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllReceiptsForSync } from '@/lib/services/receipts';
import { syncReceiptsToSheet } from '@/lib/services/google-sheets';
import { Label } from '@/components/ui/label';
import { useModal } from '@/lib/context/ModalContext';

export default function UserSettingsPage() {
  const { user, loading: globalLoading, region, setRegion } = useGlobal();
  const t = useTranslations('userSettings');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { openModal, closeModal } = useModal();

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Google Sheets State
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // General State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Password modal–only error (success shows on page)
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user?.id) {
      const storedId = localStorage.getItem(`google_sheet_id_${user.id}`);
      setSheetId(storedId || null);
    }
  }, [user]);

  const handleInitialSync = async (spreadsheetId: string) => {
    setGoogleLoading(true);

    // Show syncing state
    openModal({
      title: t('googleSheets.syncing') || 'Syncing...',
      description: t('googleSheets.syncingDescription') || 'Please wait while we sync your receipts...',
      actions: [], // No actions while syncing
      children: (
        <div className="flex justify-center items-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    });

    try {
      // Translation wrapper for the service
      const tWrapper = (key: string) => {
        if (key === 'receipts.title') return t('googleSheets.fileTitle') || 'Receipts';
        if (key === 'receipts.receiptDate') return t('googleSheets.columns.date');
        if (key === 'receipts.merchant') return t('googleSheets.columns.merchant');
        if (key === 'receipts.total') return t('googleSheets.columns.total');
        if (key === 'receipts.link') return t('googleSheets.columns.link');
        if (key === 'receipts.id') return t('googleSheets.columns.id');
        return key;
      };

      // Fetch ALL receipts for the user
      const receipts = await getAllReceiptsForSync(user!.id);

      // Sync them (append mode, though sheet should be empty or we are appending to it)
      // pass null as lastSyncDate to force checking all, or we could pass null to rely on sheet check
      const result = await syncReceiptsToSheet(receipts, null, tWrapper);

      if (user?.id) {
        localStorage.setItem(`last_export_date_${user.id}`, result.timestamp);
      }

      openModal({
        title: t('googleSheets.success'),
        description: t('googleSheets.exportSuccessMessage') || 'Your receipts have been successfully exported to Google Sheets.',
        actions: [
          {
            label: tCommon('close') || 'Close',
            onClick: closeModal,
            variant: 'outline'
          },
          {
            label: t('googleSheets.openSheet') || 'Open Sheet',
            onClick: () => {
              window.open(result.url, '_blank');
              closeModal();
            },
            variant: 'default'
          }
        ]
      });
    } catch (error) {
      console.error('Initial sync failed:', error);
      setError('Failed to sync existing receipts');
      openModal({
        title: 'Error',
        description: 'Failed to sync existing receipts',
        actions: [{ label: 'OK', onClick: closeModal, variant: 'default' }]
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSync = async () => {
    if (!user?.id) return;

    setGoogleLoading(true);
    setError('');
    try {
      const tWrapper = (key: string) => {
        if (key === 'receipts.title') return t('googleSheets.fileTitle') || 'Receipts';
        if (key === 'receipts.receiptDate') return t('googleSheets.columns.date');
        if (key === 'receipts.merchant') return t('googleSheets.columns.merchant');
        if (key === 'receipts.total') return t('googleSheets.columns.total');
        if (key === 'receipts.link') return t('googleSheets.columns.link');
        if (key === 'receipts.id') return t('googleSheets.columns.id');
        return key;
      };

      const id = await connectToGoogleSheets(user.id, tWrapper);
      setSheetId(id);
      setSuccess(t('googleSheets.success'));

      openModal({
        title: t('googleSheets.initialSyncTitle') || 'Connect Successful',
        description: t('googleSheets.initialSyncDescription') || 'Would you like to sync your existing receipts to this sheet now?',
        actions: [
          {
            label: tCommon('close') || 'Close',
            onClick: closeModal,
            variant: 'outline'
          },
          {
            label: t('googleSheets.syncNow') || 'Sync Existing Receipts',
            onClick: () => handleInitialSync(id),
            variant: 'default'
          }
        ]
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect to Google Sheets');

      openModal({
        title: 'Error',
        description: err.message || t('googleSheets.connectError') || 'Failed to connect to Google Sheets',
        actions: [{ label: 'OK', onClick: closeModal, variant: 'default' }]
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (!user?.id) return;

    openModal({
      title: t('googleSheets.disconnectConfirmTitle') || 'Disconnect Google Sheets',
      description: t('googleSheets.disconnectConfirmDescription') || 'Are you sure you want to disconnect? You can reconnect at any time.',
      actions: [
        {
          label: tCommon('cancel') || 'Cancel',
          onClick: closeModal,
          variant: 'outline'
        },
        {
          label: t('googleSheets.disconnect') || 'Disconnect',
          onClick: () => {
            localStorage.removeItem(`google_sheet_id_${user.id}`);
            localStorage.removeItem(`last_export_date_${user.id}`);
            setSheetId(null);
            setSuccess('');
            closeModal();
          },
          variant: 'destructive'
        }
      ]
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      setPasswordError(t('changePassword.error.missingCurrentPassword'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('changePassword.error.mismatch'));
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');

    try {
      const supabase = await createSPASassClient();
      const client = supabase.getSupabaseClient();

      // Verify current password first
      const { error: signInError } = await client.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword
      });
      if (signInError) {
        setPasswordError(t('changePassword.error.wrongCurrentPassword'));
        setPasswordLoading(false);
        return;
      }

      const { error } = await client.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess(t('changePassword.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordModalOpen(false);
    } catch (err: Error | unknown) {
      const message = err instanceof Error ? err.message : '';
      const isSamePassword = typeof message === 'string' && /new password should be different|same as the old|must be different/i.test(message);
      if (isSamePassword) {
        setPasswordError(t('changePassword.error.newPasswordMustDiffer'));
      } else if (err instanceof Error) {
        console.error('Error updating password:', err);
        setPasswordError(err.message);
      } else {
        setPasswordError(t('changePassword.error.generic'));
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => initGoogleAuth()} />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="settings-title">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {error && (
        <Alert variant="destructive" data-testid="settings-error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success" data-testid="settings-success">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card data-testid="user-details-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('userDetails.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('userDetails.email')}</label>
                <p className="mt-1 text-sm text-foreground" data-testid="user-email">
                  {user?.email}
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {sheetId ? (
                    <a href={`https://docs.google.com/spreadsheets/d/${sheetId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
                      <img src="https://www.gstatic.com/images/branding/product/1x/sheets_2020q4_48dp.png" alt="Google Sheets" className="h-5 w-5" />
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-primary group-hover:underline transition-colors">{t('googleSheets.title')}</span>
                    </a>
                  ) : (
                    <>
                      <img src="https://www.gstatic.com/images/branding/product/1x/sheets_2020q4_48dp.png" alt="Google Sheets" className="h-5 w-5" />
                      <span className="text-sm font-medium text-muted-foreground">{t('googleSheets.title')}</span>
                    </>
                  )}
                </div>
                {sheetId ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                      <div className="h-2 w-2 rounded-full bg-[#10B981]" />
                      <span className="text-sm font-medium text-emerald-700">{t('googleSheets.synced')}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleDisconnect} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title={t('googleSheets.disconnect')}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button onClick={handleGoogleSync} disabled={googleLoading} className="flex items-center gap-1.5 outline-none hover:bg-slate-50 px-2 py-1 rounded-md transition-colors">
                    <div className="h-2 w-2 rounded-full bg-[#64748b]" />
                    <span className="text-sm font-semibold text-[#1ab8a0]">{googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('googleSheets.connect')}</span>
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="change-password-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t('changePassword.title')}
              </CardTitle>
              <CardDescription>{t('changePassword.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog
                open={isPasswordModalOpen}
                onOpenChange={(open) => {
                  if (!passwordLoading) {
                    setIsPasswordModalOpen(open);
                    if (open) {
                      // Clear form and modal error when opening
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                    }
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto" data-testid="change-password-button">
                    {t('changePassword.button')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]" data-testid="change-password-modal">
                  <DialogHeader>
                    <DialogTitle>{t('changePassword.title')}</DialogTitle>
                    <DialogDescription>{t('changePassword.subtitle')}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePasswordChange} className="space-y-4 py-4">
                    {passwordError && (
                      <Alert variant="destructive" data-testid="password-modal-error">
                        <AlertDescription>{passwordError}</AlertDescription>
                      </Alert>
                    )}
                    {/* Hidden password field so the browser fills this instead of the visible current password field */}
                    <input type="password" autoComplete="current-password" tabIndex={-1} aria-hidden className="absolute -left-[9999px] w-px h-px opacity-0 pointer-events-none" readOnly />
                    <div className="space-y-2">
                      <Label htmlFor="current-password">{t('changePassword.currentPassword')}</Label>
                      <Input type="password" id="current-password" autoComplete="off" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={passwordLoading} data-testid="current-password-input" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">{t('changePassword.newPassword')}</Label>
                      <Input type="password" id="new-password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required disabled={passwordLoading} data-testid="new-password-input" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">{t('changePassword.confirmNewPassword')}</Label>
                      <Input type="password" id="confirm-password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={passwordLoading} data-testid="confirm-password-input" />
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={passwordLoading} data-testid="submit-password-change">
                        {passwordLoading ? t('changePassword.loading') : t('changePassword.button')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Verify Email */}
          {!globalLoading && !user?.email_confirmed_at && (
            <Card data-testid="verify-email-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {t('verifyEmail.title')}
                </CardTitle>
                <CardDescription>{t('verifyEmail.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="link" className="p-0 h-auto">
                  {t('verifyEmail.sent')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Language */}
          <Card data-testid="language-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('language.title')}
              </CardTitle>
              <CardDescription>{t('language.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue={locale}
                onChange={(e) => {
                  const newLocale = e.target.value;
                  document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
                  window.location.reload();
                }}
                data-testid="language-select"
              >
                <option value="en">{t('language.english')}</option>
                <option value="es">{t('language.spanish')}</option>
              </select>
            </CardContent>
          </Card>

          {/* Region */}
          <Card data-testid="region-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t('region.title')}
              </CardTitle>
              <CardDescription>{t('region.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  window.location.reload();
                }}
                data-testid="region-select"
              >
                <option value="en-US">United States (USD)</option>
                <option value="es-CL">Chile (CLP)</option>
                <option value="es-MX">Mexico (MXN)</option>
                <option value="es-AR">Argentina (ARS)</option>
                <option value="es-CO">Colombia (COP)</option>
                <option value="es-PE">Peru (PEN)</option>
              </select>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
