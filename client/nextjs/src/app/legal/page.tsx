
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

export default function LegalPage() {
    const t = useTranslations('legal');

    return (
        <div className="container mx-auto px-4 py-8">
            {t('sidebar.selectDocument')}
        </div>
    );
}