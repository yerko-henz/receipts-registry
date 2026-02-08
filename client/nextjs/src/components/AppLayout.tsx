"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {usePathname, useRouter} from 'next/navigation';
import {
    Home,
    User,
    Menu,
    X,
    ChevronDown,
    LogOut,
    Key, 
    ScrollText, // Receipts
    Scan,       // Analyze
    Settings,    // App Settings
} from 'lucide-react';
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";
import { ThemeToggle } from '@/components/ThemeToggle';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations('dashboard.nav');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isUserDropdownOpen, setUserDropdownOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();


    const { user } = useGlobal();

    const handleLogout = async () => {
        try {
            const client = await createSPASassClient();
            await client.logout();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };
    const handleChangePassword = async () => {
        router.push(`/dashboard/user-settings`)
    };

    const getInitials = (email: string) => {
        const parts = email.split('@')[0].split(/[._-]/);
        return parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
    };

    const productName = process.env.NEXT_PUBLIC_PRODUCTNAME;

    const navigation = [
        { name: t('homepage'), href: `/dashboard`, icon: Home },
        { name: t('receipts'), href: `/dashboard/receipts`, icon: ScrollText },
        { name: t('analyze'), href: `/dashboard/analyze`, icon: Scan },
        // { name: t('questions'), href: `/dashboard/questions`, icon: MessageCircle },
        { name: t('userSettings'), href: `/dashboard/user-settings`, icon: User },
    ];

    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-20 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out z-30 
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

                <div className="h-16 flex items-center justify-between px-4 border-b">
                    <span className="text-xl font-semibold text-primary">{productName}</span>
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="mt-4 px-2 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                <item.icon
                                    className={`mr-3 h-5 w-5 ${
                                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                                    }`}
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

            </div>

            <div className="lg:pl-64">
                <div className="sticky top-0 z-10 flex items-center justify-between h-16 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b px-4">
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden text-muted-foreground hover:text-foreground"
                    >
                        <Menu className="h-6 w-6"/>
                    </button>

                    <div className="relative ml-auto flex items-center gap-4">
                        <ThemeToggle />

                        <button
                            onClick={() => setUserDropdownOpen(!isUserDropdownOpen)}
                            className="flex items-center space-x-2 text-sm text-foreground hover:text-muted-foreground"
                        >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-medium">
                                    {user ? getInitials(user.email) : '??'}
                                </span>
                            </div>
                            <span className="hidden sm:inline-block">{user?.email || 'Loading...'}</span>
                            <ChevronDown className="h-4 w-4"/>
                        </button>

                        {isUserDropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-popover rounded-md shadow-lg border z-50">
                                <div className="p-2 border-b">
                                    <p className="text-xs text-muted-foreground">{t('dropdown.signedInAs')}</p>
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {user?.email}
                                    </p>
                                </div>
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setUserDropdownOpen(false);
                                            handleChangePassword()
                                        }}
                                        className="w-full flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
                                    >
                                        <Key className="mr-3 h-4 w-4 text-muted-foreground"/>
                                        {t('dropdown.changePassword')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setUserDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                                    >
                                        <LogOut className="mr-3 h-4 w-4 text-destructive"/>
                                        {t('dropdown.signOut')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <main className="p-4">
                    {children}
                </main>
            </div>
        </div>
    );
}