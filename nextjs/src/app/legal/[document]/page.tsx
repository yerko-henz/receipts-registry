'use client';

import React from 'react';
import LegalDocument from '@/components/LegalDocument';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';

const legalDocuments = {
    'privacy': {
        titleKey: 'document.privacy',
        path: '/terms/privacy-notice.md'
    },
    'terms': {
        titleKey: 'document.terms',
        path: '/terms/terms-of-service.md'
    },
    'refund': {
        titleKey: 'document.refund',
        path: '/terms/refund-policy.md'
    }
} as const;

type LegalDocumentKey = keyof typeof legalDocuments;

interface LegalPageProps {
    document: LegalDocumentKey;
    lng: string;
}

interface LegalPageParams {
    params: Promise<LegalPageProps>
}

export default function LegalPage({ params }: LegalPageParams) {
    const {document} = React.use<LegalPageProps>(params);
    const t = useTranslations('legal');

    if (!legalDocuments[document]) {
        notFound();
    }

    const { titleKey, path } = legalDocuments[document];

    return (
        <div className="container mx-auto px-4 py-8">
            <LegalDocument
                title={t(titleKey)}
                filePath={path}
            />
        </div>
    );
}