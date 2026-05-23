'use client'

import { LogOut, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { UserRole } from "@/types";
import NotificationBell from "@/components/NotificationBell";

export default function Header() {
    const { user, logout } = useAuth();

    return (
        <div className="flex items-center gap-2">
            <NotificationBell />
            {user?.roles?.includes(UserRole.Admin) && (
                <Link
                    href="/admin/security"
                    className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-colors"
                    title="Logging & Monitoring"
                >
                    <Shield className="w-4 h-4" />
                    <span>Security</span>
                </Link>
            )}
            <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                title="Settings"
            >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
            </Link>
            <button
                onClick={() => logout()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                title="Sign out"
            >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
            </button>
        </div>
    );
}
