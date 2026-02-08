'use client';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, X } from 'lucide-react';
import { setCookie, getCookie } from 'cookies-next/client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const COOKIE_CONSENT_KEY = 'cookie-accept';
const COOKIE_EXPIRY_DAYS = 365;

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);
    const t = useTranslations('cookies');

    useEffect(() => {
        const consent = getCookie(COOKIE_CONSENT_KEY);
        if (!consent) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        setCookie(COOKIE_CONSENT_KEY, 'accepted', {
            expires: new Date(Date.now() + COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            path: '/'
        });
        setIsVisible(false);
    };

    const handleDecline = () => {
        setCookie(COOKIE_CONSENT_KEY, 'declined', {
            expires: new Date(Date.now() + COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            path: '/'
        });
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50 transform transition-transform ease-in-out">
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <Shield className="h-5 w-5 text-primary" />
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                {t('message')}
                            </p>
                            <p className="text-sm text-muted-foreground/80">
                                {t.rich('moreInfo', {
                                    privacyPolicy: (chunks) => (
                                        <Link
                                            href={`/legal/privacy`}
                                            className="text-primary hover:text-primary/80 underline underline-offset-4"
                                        >
                                            {chunks}
                                        </Link>
                                    ),
                                    termsOfService: (chunks) => (
                                        <Link
                                            href={`/legal/terms`}
                                            className="text-primary hover:text-primary/80 underline underline-offset-4"
                                        >
                                            {chunks}
                                        </Link>
                                    ),
                                })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDecline}
                            className="text-muted-foreground hover:text-foreground border-border"
                        >
                            {t('decline')}
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleAccept}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {t('accept')}
                        </Button>
                        <button
                            onClick={handleDecline}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label={t('close')}
                        >
                            <X className="h-4 w-4 text-gray-500" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;