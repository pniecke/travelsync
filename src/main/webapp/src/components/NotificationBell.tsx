'use client'

import { Bell, BellRing, Calendar, DollarSign, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useNotifications } from "@/hooks/useNotifications";
import { Notification, NotificationType } from "@/types";
import { formatRelative } from "@/utils/date";

function iconFor(type: NotificationType) {
    switch (type) {
        case NotificationType.ExpenseInvolvingYou:
            return <DollarSign className="w-4 h-4 text-green-400" />;
        case NotificationType.AddedToTrip:
            return <UserPlus className="w-4 h-4 text-blue-400" />;
        case NotificationType.TripStarted:
            return <Calendar className="w-4 h-4 text-amber-400" />;
    }
}

export default function NotificationBell() {
    const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (!open) return;
        const onClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [open]);

    const handleRowClick = (n: Notification) => {
        if (!n.read) markRead(n.id);
        setOpen(false);
        if (n.tripId) {
            router.push(`/trips/${n.tripId}/balances`);
        }
    };

    const badge = unreadCount > 9 ? '9+' : String(unreadCount);

    return (
        <div ref={wrapperRef} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="relative flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                title="Notifications"
                aria-label="Notifications"
            >
                {unreadCount > 0 ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                <span>Notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none">
                        {badge}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-96 max-h-[28rem] overflow-hidden bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-100">Notifications</h4>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllRead()}
                                className="text-xs text-blue-400 hover:text-blue-300"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-400">
                                You&apos;re all caught up.
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-700">
                                {notifications.map(n => (
                                    <li key={n.id}>
                                        <button
                                            onClick={() => handleRowClick(n)}
                                            className={`w-full flex gap-3 px-4 py-3 text-left hover:bg-gray-700/50 transition-colors ${
                                                n.read ? '' : 'bg-blue-900/10'
                                            }`}
                                        >
                                            <div className="mt-0.5 shrink-0">{iconFor(n.type)}</div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm ${n.read ? 'text-gray-300' : 'text-gray-100 font-semibold'} truncate`}>
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-gray-400 line-clamp-2">{n.message}</p>
                                            </div>
                                            <div className="shrink-0 text-[10px] text-gray-500 whitespace-nowrap">
                                                {formatRelative(n.createdAt)}
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
