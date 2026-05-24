'use client'

import {AlertTriangle, RefreshCw, Shield, ShieldAlert, ShieldCheck, UserCheck, UserX} from "lucide-react";
import React, {useState} from "react";
import {GetServerSideProps} from "next";
import {User, UserRole} from "@/types";
import {createServerApiClient} from "@/services/apiClient";
import {getLoggedInUser} from "@/services/userService";
import {
    getSecurityEvents,
    getSecurityStats,
    SecurityEvent,
    SecurityEventType,
    SecurityStats,
} from "@/services/adminService";
import {formatDate} from "@/utils/date";

interface SecurityPageProps {
    user: User
    initialEvents: SecurityEvent[]
    initialStats: SecurityStats
}

export const getServerSideProps: GetServerSideProps<SecurityPageProps> = async (ctx) => {
    const cookieHeader = ctx.req.headers.cookie
    if (!cookieHeader) {
        return {redirect: {destination: '/login', permanent: false}}
    }
    const ssrClient = createServerApiClient(cookieHeader)
    try {
        const user = await getLoggedInUser(ssrClient);
        if (!user.roles?.includes(UserRole.Admin)) {
            return {redirect: {destination: '/dashboard', permanent: false}}
        }
        const [initialEvents, initialStats] = await Promise.all([
            getSecurityEvents(200, ssrClient),
            getSecurityStats(ssrClient),
        ]);
        return {props: {user, initialEvents, initialStats}}
    } catch {
        return {redirect: {destination: '/login', permanent: false}}
    }
}

const TYPE_META: Record<SecurityEventType, { label: string; classes: string; icon: React.ReactNode }> = {
    LOGIN_FAILURE: {
        label: "Login failure",
        classes: "bg-red-900/30 text-red-300 border-red-800",
        icon: <UserX className="w-4 h-4"/>,
    },
    LOGIN_SUCCESS: {
        label: "Login success",
        classes: "bg-green-900/30 text-green-300 border-green-800",
        icon: <UserCheck className="w-4 h-4"/>,
    },
    ACCOUNT_LOCKED: {
        label: "Account locked",
        classes: "bg-amber-900/30 text-amber-300 border-amber-800",
        icon: <ShieldAlert className="w-4 h-4"/>,
    },
    IP_LOGIN_THROTTLED: {
        label: "IP throttled",
        classes: "bg-purple-900/30 text-purple-300 border-purple-800",
        icon: <AlertTriangle className="w-4 h-4"/>,
    },
    SIGNUP_THROTTLED: {
        label: "Signup throttled",
        classes: "bg-fuchsia-900/30 text-fuchsia-300 border-fuchsia-800",
        icon: <AlertTriangle className="w-4 h-4"/>,
    },
    SIGNUP_SUCCESS: {
        label: "Signup",
        classes: "bg-blue-900/30 text-blue-300 border-blue-800",
        icon: <ShieldCheck className="w-4 h-4"/>,
    },
};

type Filter = "ALL" | SecurityEventType;

export default function SecurityPage({initialEvents, initialStats}: SecurityPageProps) {
    const [events, setEvents] = useState<SecurityEvent[]>(initialEvents);
    const [stats, setStats] = useState<SecurityStats>(initialStats);
    const [filter, setFilter] = useState<Filter>("ALL");
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = async () => {
        setRefreshing(true);
        setError(null);
        try {
            const [e, s] = await Promise.all([getSecurityEvents(200), getSecurityStats()]);
            setEvents(e);
            setStats(s);
        } catch (err) {
            console.error(err);
            setError("Failed to refresh security data.");
        } finally {
            setRefreshing(false);
        }
    };

    const filtered = filter === "ALL" ? events : events.filter(e => e.type === filter);

    const failureCount = (stats.byType.LOGIN_FAILURE ?? 0) + (stats.byType.IP_LOGIN_THROTTLED ?? 0);
    const lockoutCount = stats.byType.ACCOUNT_LOCKED ?? 0;
    const signupAbuseCount = stats.byType.SIGNUP_THROTTLED ?? 0;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8 pl-4 border-l-4 border-amber-500">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-amber-400"/>
                        <h1 className="text-3xl font-bold text-gray-100">Logging &amp; Monitoring</h1>
                    </div>
                    <button
                        onClick={refresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}/>
                        <span>Refresh</span>
                    </button>
                </div>
                <p className="text-gray-400 pl-9">
                    Track auth failures, account lockouts, and token/throttle abuse.
                </p>
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 text-red-300 rounded-lg">
                    {error}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    label="Total events"
                    value={stats.total}
                    color="border-gray-600"
                    icon={<Shield className="w-6 h-6 text-gray-300"/>}
                />
                <StatCard
                    label="Auth failures"
                    value={failureCount}
                    color="border-red-700"
                    icon={<UserX className="w-6 h-6 text-red-400"/>}
                />
                <StatCard
                    label="Account lockouts"
                    value={lockoutCount}
                    color="border-amber-700"
                    icon={<ShieldAlert className="w-6 h-6 text-amber-400"/>}
                />
                <StatCard
                    label="Signup abuse"
                    value={signupAbuseCount}
                    color="border-fuchsia-700"
                    icon={<AlertTriangle className="w-6 h-6 text-fuchsia-400"/>}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                <TopList title="Top IPs" entries={stats.topIps} emptyText="No IPs recorded yet."/>
                <TopList title="Top identifiers" entries={stats.topIdentifiers} emptyText="No identifiers recorded yet."/>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
                <FilterChip active={filter === "ALL"} onClick={() => setFilter("ALL")}>
                    All ({stats.total})
                </FilterChip>
                {(Object.keys(TYPE_META) as SecurityEventType[]).map(t => (
                    <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)}>
                        {TYPE_META[t].label} ({stats.byType[t] ?? 0})
                    </FilterChip>
                ))}
            </div>

            {/* Events Table */}
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-100">Recent events</h3>
                    <span className="text-sm text-gray-400">{filtered.length} shown</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-900/40 text-gray-400 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 text-left">Time</th>
                            <th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-left">Identifier</th>
                            <th className="px-4 py-3 text-left">IP</th>
                            <th className="px-4 py-3 text-left">Message</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                    No events match the current filter.
                                </td>
                            </tr>
                        ) : (
                            filtered.map(ev => {
                                const meta = TYPE_META[ev.type];
                                return (
                                    <tr key={ev.id} className="border-t border-gray-700 hover:bg-gray-700/40">
                                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                                            {formatDate(ev.timestamp)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs ${meta.classes}`}>
                                                {meta.icon}
                                                {meta.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-200 font-mono">{ev.identifier ?? "—"}</td>
                                        <td className="px-4 py-3 text-gray-200 font-mono">{ev.ip ?? "—"}</td>
                                        <td className="px-4 py-3 text-gray-300">{ev.message}</td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function StatCard({
                      label,
                      value,
                      color,
                      icon,
                  }: { label: string; value: number; color: string; icon: React.ReactNode }) {
    return (
        <div className={`bg-gray-800 rounded-xl shadow-lg border ${color} p-5`}>
            <div className="flex items-center">
                <div className="p-2 bg-gray-900/40 rounded-lg">{icon}</div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-gray-300">{label}</p>
                    <p className="text-2xl font-bold text-gray-100">{value}</p>
                </div>
            </div>
        </div>
    );
}

function TopList({title, entries, emptyText}: { title: string; entries: { key: string; count: number }[]; emptyText: string }) {
    return (
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-5">
            <h3 className="text-lg font-semibold text-gray-100 mb-3">{title}</h3>
            {entries.length === 0 ? (
                <p className="text-sm text-gray-400">{emptyText}</p>
            ) : (
                <ul className="space-y-2">
                    {entries.map(e => (
                        <li key={e.key} className="flex items-center justify-between text-sm">
                            <span className="font-mono text-gray-200 truncate mr-3">{e.key}</span>
                            <span className="px-2 py-0.5 bg-gray-700 rounded text-gray-200">{e.count}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function FilterChip({active, onClick, children}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                active
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            }`}
        >
            {children}
        </button>
    );
}
