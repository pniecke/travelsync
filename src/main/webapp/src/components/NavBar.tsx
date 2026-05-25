'use client'

import Link from "next/link";
import { useRouter } from "next/router";
import { DollarSign, LayoutDashboard, MapPin, Plane } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import Header from "@/components/Header";

interface NavLinkProps {
    href: string;
    label: string;
    icon: React.ReactNode;
    active: boolean;
}

function NavLink({ href, label, icon, active }: NavLinkProps) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-gray-300 hover:bg-gray-700/60 hover:text-gray-100"
            }`}
        >
            {icon}
            <span>{label}</span>
        </Link>
    );
}

export default function NavBar() {
    const { user, loading } = useAuth();
    const router = useRouter();

    if (loading || !user) return null;

    const isActive = (path: string) =>
        router.pathname === path || router.pathname.startsWith(`${path}/`);

    return (
        <nav className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-gray-100 font-bold text-lg"
                >
                    <MapPin className="w-5 h-5 text-blue-400" />
                    <span>TravelSync</span>
                </Link>

                <div className="hidden md:flex items-center gap-1">
                    <NavLink
                        href="/dashboard"
                        label="Dashboard"
                        icon={<LayoutDashboard className="w-4 h-4" />}
                        active={isActive("/dashboard")}
                    />
                    <NavLink
                        href="/trips"
                        label="Trips"
                        icon={<Plane className="w-4 h-4" />}
                        active={isActive("/trips")}
                    />
                    <NavLink
                        href="/expenses"
                        label="Expenses"
                        icon={<DollarSign className="w-4 h-4" />}
                        active={isActive("/expenses")}
                    />
                </div>

                <Header />
            </div>
        </nav>
    );
}
