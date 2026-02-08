"use client";
import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import PricingService from "@/lib/pricing";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

const HomePricing = () => {
    const tiers = PricingService.getAllTiers();
    const commonFeatures = PricingService.getCommonFeatures();
    const t = useTranslations('pricing');

    return (
        <section id="pricing" className="py-24 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4 text-foreground">{t('title')}</h2>
                    <p className="text-muted-foreground text-lg">{t('subtitle')}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-12">
                    {tiers.map((tier) => (
                        <Card
                            key={tier.name}
                            className={`relative flex flex-col bg-card border-border ${
                                tier.popular ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/10' : ''
                            }`}
                        >
                            {tier.popular && (
                                <div className="absolute top-0 right-0 -translate-y-1/2 px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                                    {t('badge.mostPopular')}
                                </div>
                            )}

                            <CardHeader>
                                <CardTitle className="text-foreground">{tier.name}</CardTitle>
                                <CardDescription className="text-muted-foreground">{tier.description}</CardDescription>
                            </CardHeader>

                            <CardContent className="flex-grow flex flex-col">
                                <div className="mb-6">
                                    <span className="text-4xl font-bold text-foreground">{PricingService.formatPrice(tier.price)}</span>
                                    <span className="text-muted-foreground ml-2">{t('perMonth')}</span>
                                </div>

                                <ul className="space-y-3 mb-8 flex-grow">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    href="/auth/register"
                                    className={`w-full text-center px-6 py-3 rounded-lg font-medium transition-all ${
                                        tier.popular
                                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                                    }`}
                                >
                                    {t('button.getStarted')}
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="text-center">
                    <p className="text-muted-foreground">
                        {t('allPlansInclude', { features: commonFeatures.join(', ') })}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default HomePricing;
