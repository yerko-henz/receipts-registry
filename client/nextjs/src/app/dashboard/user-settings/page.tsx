"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGlobal } from '@/lib/context/GlobalContext';
import { createSPASassClientAuthenticated as createSPASassClient } from '@/lib/supabase/client';
import { Key, User, CheckCircle, FileSpreadsheet, Globe, MapPin, Palette, Mail, Loader2, Link as LinkIcon, Check } from 'lucide-react';
import { MFASetup } from '@/components/MFASetup';
import { useTranslations, useLocale } from 'next-intl';
import Script from 'next/script';
import { connectToGoogleSheets, initGoogleAuth } from '@/lib/services/google-sheets';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function UserSettingsPage() {
    const { user, loading: globalLoading, region, setRegion } = useGlobal();
    const t = useTranslations('userSettings');
    const locale = useLocale();
    
    // Password State
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

    useEffect(() => {
        // Check for existing sheet ID
        const storedId = localStorage.getItem('google_sheet_id');
        if (storedId) {
            setSheetId(storedId);
        }
    }, []);

    const handleGoogleSync = async () => {
        setGoogleLoading(true);
        setError('');
        try {
            // Pass a simple translation function or use t directly if keys match
            // The service expects keys like 'receipts.title'
            // We can map them to our current translations or pass hardcoded strings for now if keys are missing in web
            // For now, let's wrap t to handle defaults if keys missing
            const tWrapper = (key: string) => {
                 // Map mobile keys to web keys or defaults
                 if (key === 'receipts.title') return t('googleSheets.fileTitle') || 'Receipts';
                 if (key === 'receipts.receiptDate') return 'Date';
                 if (key === 'receipts.merchant') return 'Merchant';
                 if (key === 'receipts.total') return 'Total';
                 if (key === 'receipts.link') return 'Standard Link'; 
                 if (key === 'receipts.id') return 'ID';
                 return key;
            };

            const id = await connectToGoogleSheets(tWrapper);
            setSheetId(id);
            setSuccess(t('googleSheets.success'));
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to connect to Google Sheets');
        } finally {
            setGoogleLoading(false);
        }
    };


    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError(t("changePassword.error.mismatch"));
            return;
        }

        setPasswordLoading(true);
        setError('');
        setSuccess('');

        try {
            const supabase = await createSPASassClient();
            const client = supabase.getSupabaseClient();

            const { error } = await client.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setSuccess(t('changePassword.success'));
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: Error | unknown) {
            if (err instanceof Error) {
                console.error('Error updating password:', err);
                setError(err.message);
            } else {
                console.error('Error updating password:', err);
                setError(t('changePassword.error.generic'));
            }
        } finally {
            setPasswordLoading(false);
        }
    };



    return (
        <div className="space-y-6 p-6">
            <Script 
                src="https://accounts.google.com/gsi/client" 
                strategy="afterInteractive"
                onLoad={() => initGoogleAuth()}
            />

            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight" data-testid="settings-title">{t('title')}</h1>
                <p className="text-muted-foreground">
                    {t('subtitle')}
                </p>
            </div>

            {error && (
                <Alert variant="destructive" data-testid="settings-error">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert data-testid="settings-success">
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
                                <p className="mt-1 text-sm text-foreground" data-testid="user-email">{user?.email}</p>
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-2">
                                    {sheetId ? (
                                        <a 
                                           href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
                                           target="_blank"
                                           rel="noopener noreferrer"
                                           className="flex items-center gap-2 group"
                                        >
                                            <img 
                                                src="https://www.gstatic.com/images/branding/product/1x/sheets_2020q4_48dp.png" 
                                                alt="Google Sheets" 
                                                className="h-5 w-5"
                                            />
                                            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary group-hover:underline transition-colors">
                                                {t('googleSheets.title')}
                                            </span>
                                        </a>
                                    ) : (
                                        <>
                                            <img 
                                                src="https://www.gstatic.com/images/branding/product/1x/sheets_2020q4_48dp.png" 
                                                alt="Google Sheets" 
                                                className="h-5 w-5"
                                            />
                                            <span className="text-sm font-medium text-muted-foreground">
                                                {t('googleSheets.title')}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <button 
                                    onClick={handleGoogleSync}
                                    disabled={!!sheetId || googleLoading}
                                    className="flex items-center gap-1.5 outline-none"
                                >
                                    <div className={`h-2 w-2 rounded-full ${sheetId ? 'bg-[#10B981]' : 'bg-[#64748b]'}`} />
                                    <span className={`text-sm ${sheetId ? 'font-medium text-foreground' : 'font-semibold text-[#1ab8a0]'}`}>
                                        {googleLoading ? '...' : (sheetId ? t('googleSheets.synced') : t('googleSheets.connect'))}
                                    </span>
                                </button>
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
                            <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                                <DialogTrigger asChild>
                                    <Button className="w-full sm:w-auto" data-testid="change-password-button">
                                        {t('changePassword.button')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]" data-testid="change-password-modal">
                                    <DialogHeader>
                                        <DialogTitle>{t('changePassword.title')}</DialogTitle>
                                        <DialogDescription>
                                            {t('changePassword.subtitle')}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handlePasswordChange} className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="new-password">{t('changePassword.newPassword')}</Label>
                                            <Input
                                                type="password"
                                                id="new-password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                                data-testid="new-password-input"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirm-password">{t('changePassword.confirmNewPassword')}</Label>
                                            <Input
                                                type="password"
                                                id="confirm-password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                data-testid="confirm-password-input"
                                            />
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