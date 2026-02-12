export interface PricingTier {
    id: string;
    price: number;
    popular?: boolean;
    featureKeys: string[];
}

class PricingService {
    private static tiers: PricingTier[] = [
        {
            id: "free",
            price: 0,
            popular: false,
            featureKeys: ["receipts", "categorization", "retention", "support"]
        },
        {
            id: "pro",
            price: 9.99,
            popular: true,
            featureKeys: ["receipts", "ai", "retention", "categories", "export", "support"]
        }
    ];

    static initialize() {
        // No initialization needed for static tiers
    }

    static getAllTiers(): PricingTier[] {
        return this.tiers;
    }

    static getCommonFeatures(): string[] {
        return [
            "Secure Cloud Storage",
            "Mobile App Access",
            "SSL Encryption"
        ];
    }

    static formatPrice(price: number): string {
        return price === 0 ? "Free" : `$${price}`;
    }

}

export default PricingService;