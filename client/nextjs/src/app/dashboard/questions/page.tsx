"use client";
import React from 'react';
import { useTranslations } from 'next-intl';

export default function QuestionsPage() {
    const t = useTranslations('questions');

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">
                    {t('subtitle')}
                </p>
            </div>
            
            <div className="border rounded-lg p-8 text-center text-gray-500">
                <p>{t('comingSoon')}</p>
            </div>
        </div>
    );
}
