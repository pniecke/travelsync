'use client'

import {GetServerSideProps} from "next";
import {useRouter} from "next/router";
import {Calendar, DollarSign, Handshake, Info, MapPin} from "lucide-react";
import {ReactNode, useMemo} from "react";
import {createServerApiClient} from "@/services/apiClient";
import {getLoggedInUser} from "@/services/userService";
import {getTripById} from "@/services/tripService";
import {getTripBalances, getTripSettlements} from "@/services/splitService";
import {getExpenses} from "@/services/expenseService";
import {Expense, Settlement, Trip, TripBalances, User} from "@/types";
import {formatDate} from "@/utils/date";
import {tripBadge, tripExpenseTotals} from "@/utils/trip";
import TripOverviewTab from "@/components/trip/TripOverviewTab";
import TripExpensesTab from "@/components/trip/TripExpensesTab";
import TripBalancesTab from "@/components/trip/TripBalancesTab";

type TabKey = "overview" | "expenses" | "balances";

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
    {key: "overview", label: "Overview", icon: <Info className="w-4 h-4"/>},
    {key: "expenses", label: "Expenses", icon: <DollarSign className="w-4 h-4"/>},
    {key: "balances", label: "Balances", icon: <Handshake className="w-4 h-4"/>},
];

interface PageProps {
    user: User;
    trip: Trip;
    initialExpenses: Expense[];
    initialBalances: TripBalances;
    initialSettlements: Settlement[];
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
    const cookieHeader = ctx.req.headers.cookie;
    if (!cookieHeader) {
        return {redirect: {destination: '/login', permanent: false}};
    }
    const tripId = ctx.params?.id as string | undefined;
    if (!tripId) {
        return {notFound: true};
    }
    const ssrClient = createServerApiClient(cookieHeader);
    try {
        const user = await getLoggedInUser(ssrClient);
        const trip = await getTripById(tripId, ssrClient);
        const [expenses, balances, settlements] = await Promise.all([
            getExpenses({tripId}, ssrClient).catch(() => [] as Expense[]),
            getTripBalances(tripId, ssrClient).catch(() => ({
                tripId,
                balances: [],
                suggestedSettlements: [],
            } as TripBalances)),
            getTripSettlements(tripId, ssrClient).catch(() => [] as Settlement[]),
        ]);
        return {
            props: {
                user,
                trip,
                initialExpenses: expenses,
                initialBalances: balances,
                initialSettlements: settlements,
            },
        };
    } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 404 || status === 403) return {notFound: true};
        console.error("Error loading trip detail:", e);
        return {redirect: {destination: '/login', permanent: false}};
    }
};

export default function TripDetailPage({
                                           user,
                                           trip,
                                           initialExpenses,
                                           initialBalances,
                                           initialSettlements,
                                       }: PageProps) {
    const router = useRouter();
    const tabParam = (Array.isArray(router.query.tab) ? router.query.tab[0] : router.query.tab) as
        TabKey | undefined;
    const activeTab: TabKey = TABS.some(t => t.key === tabParam) ? (tabParam as TabKey) : "overview";

    const setTab = (key: TabKey) => {
        router.replace(
            {pathname: router.pathname, query: {...router.query, tab: key}},
            undefined,
            {shallow: true},
        );
    };

    const badge = useMemo(() => tripBadge(trip), [trip]);
    const totals = useMemo(() => tripExpenseTotals(trip), [trip]);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6 pl-4 border-l-4 border-blue-500">
                <div className="flex items-start justify-between gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-100">
                        {trip.name || trip.destination}
                    </h1>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${badge.classes}`}>
                        {badge.label}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                    {trip.name && (
                        <span className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1"/>
                            {trip.destination}
                        </span>
                    )}
                    <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1"/>
                        {formatDate(trip.startTime)}
                        {trip.endTime && ` – ${formatDate(trip.endTime)}`}
                    </span>
                    {totals.length > 0 && (
                        <span className="flex items-center tabular-nums">
                            <DollarSign className="w-4 h-4 mr-1"/>
                            {totals.map(([cur, sum]) => `${sum.toFixed(2)} ${cur}`).join(' + ')}
                        </span>
                    )}
                </div>
            </div>

            {/* Tab bar */}
            <div className="mb-6 border-b border-gray-700 flex gap-2">
                {TABS.map(t => {
                    const active = t.key === activeTab;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-colors text-sm font-medium ${
                                active
                                    ? "border-blue-500 text-blue-300"
                                    : "border-transparent text-gray-400 hover:text-gray-200"
                            }`}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            {activeTab === "overview" && (
                <TripOverviewTab user={user} trip={trip}/>
            )}
            {activeTab === "expenses" && (
                <TripExpensesTab user={user} trip={trip} initialExpenses={initialExpenses}/>
            )}
            {activeTab === "balances" && (
                <TripBalancesTab
                    user={user}
                    trip={trip}
                    initialBalances={initialBalances}
                    initialSettlements={initialSettlements}
                />
            )}
        </div>
    );
}
