"use client";
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGlobal } from '@/lib/context/GlobalContext';
import { createSPASassClientAuthenticated as createSPASassClient } from '@/lib/supabase/client';
import { Key, User, CheckCircle, FileSpreadsheet, Globe, MapPin, Palette, Mail } from 'lucide-react';
import { MFASetup } from '@/components/MFASetup';
import { useTranslations, useLocale } from 'next-intl';
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
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);


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
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">
                    {t('subtitle')}
                </p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                {t('userDetails.title')}
                            </CardTitle>
                            <CardDescription>{t('userDetails.subtitle')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('userDetails.email')}</label>
                                <p className="mt-1 text-sm text-foreground">{user?.email}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
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
                                    <Button className="w-full sm:w-auto">
                                        {t('changePassword.button')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
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
                                            />
                                        </div>
                                         <div className="flex justify-end pt-4">
                                             <Button type="submit" disabled={passwordLoading}>
                                                 {passwordLoading ? t('changePassword.loading') : t('changePassword.button')}
                                             </Button>
                                         </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>

                    {/* Google Sheets Sync */}
                    <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5" />
                                {t('googleSheets.title')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                                <span className="text-sm text-muted-foreground">{t('googleSheets.connect')}</span>
                            </div>
                            <Button variant="outline" disabled>
                                {t('googleSheets.connect')}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Verify Email */}
                     {!globalLoading && !user?.email && (
                        <Card>
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
                    <Card>
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
                            >
                                <option value="en">{t('language.english')}</option>
                                <option value="es">{t('language.spanish')}</option>
                            </select>
                        </CardContent>
                    </Card>

                    {/* Region */}
                     <Card>
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