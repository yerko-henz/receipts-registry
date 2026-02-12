import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AuthLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    const productName = process.env.NEXT_PUBLIC_PRODUCTNAME;
    const testimonials = [
        {
            quote: "This template helped us launch our SaaS product in just two weeks. The authentication and multi-tenancy features are rock solid.",
            author: "Sarah Chen",
            role: "CTO, TechStart",
            avatar: "SC"
        },
        {
            quote: "The best part is how well thought out the organization management is. It saved us months of development time.",
            author: "Michael Roberts",
            role: "Founder, DataFlow",
            avatar: "MR"
        },
        {
            quote: "Clean code, great documentation, and excellent support. Exactly what we needed to get our MVP off the ground.",
            author: "Jessica Kim",
            role: "Lead Developer, CloudScale",
            avatar: "JK"
        }
    ];

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950 items-center justify-center">
            <div className="w-full max-w-md py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-800 relative">
                <Link
                    href="/"
                    className="absolute left-8 top-8 flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Link>

                <div className="sm:mx-auto sm:w-full sm:max-w-md mt-8">
                    <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {productName}
                    </h2>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    {children}
                </div>
            </div>
        </div>
    );
}