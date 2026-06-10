'use client'

import {GetServerSideProps} from "next";
import {useRouter} from "next/router";
import {AxiosError} from "axios";
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    DollarSign,
    DoorOpen,
    Handshake,
    Info,
    MapPin,
    Pencil,
    RotateCcw,
    Share2,
    Trash2,
    XCircle,
} from "lucide-react";
import {ReactNode, useMemo, useState} from "react";
import {createServerApiClient} from "@/services/apiClient";
import {getLoggedInUser} from "@/services/userService";
import {deleteTrip, getTripById, updateTrip} from "@/services/tripService";
import {getTripBalances, getTripSettlements} from "@/services/splitService";
import {getExpenses} from "@/services/expenseService";
import {ApiError, Expense, Settlement, Trip, TripBalances, TripStatus, User} from "@/types";
import {formatDate} from "@/utils/date";
import {tripBadge, tripExpenseTotals} from "@/utils/trip";
import TripOverviewTab from "@/components/trip/TripOverviewTab";
import TripExpensesTab from "@/components/trip/TripExpensesTab";
import TripBalancesTab from "@/components/trip/TripBalancesTab";
import TripDialog from "@/components/TripDialog";
import ShareTripDialog from "@/components/trip/ShareTripDialog";

type TabKey = "overview" | "expenses" | "balances";

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
    {key: "overview", label: "Overview", icon: <Info className="w-4 h-4"/>},
    {key: "expenses", label: "Expenses", icon: <DollarSign className="w-4 h-4"/>},
    {key: "balances", label: "Balances", icon: <Handshake className="w-4 h-4"/>},
];

interface PageProps {
    user: User;
    trip: Trip;
    allUsers: User[];
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
        const [expenses, balances, settlements, allUsersRes] = await Promise.all([
            getExpenses({tripId}, ssrClient).catch(() => [] as Expense[]),
            getTripBalances(tripId, ssrClient).catch(() => ({
                tripId,
                balances: [],
                suggestedSettlements: [],
            } as TripBalances)),
            getTripSettlements(tripId, ssrClient).catch(() => [] as Settlement[]),
            ssrClient.get<User[]>('/users').catch(() => ({data: [] as User[]})),
        ]);
        const allUsers = allUsersRes.data.filter(u => u.id !== user.id);
        return {
            props: {
                user,
                trip,
                allUsers,
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

function toPutPayload(trip: Trip): Trip {
    // Backend resolves participants by id only; sending PII back fails @Valid.
    return {
        ...trip,
        participants: (trip.participants ?? []).map(p => ({id: p.id, username: p.username} as User)),
    };
}

export default function TripDetailPage({
                                           user,
                                           trip: initialTrip,
                                           allUsers,
                                           initialExpenses,
                                           initialBalances,
                                           initialSettlements,
                                       }: PageProps) {
    const router = useRouter();
    const [trip, setTrip] = useState<Trip>(initialTrip);
    const [editOpen, setEditOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
    const isCreator = !!trip.createdById && trip.createdById === user.id;
    const tripHasAnyTies = initialExpenses.length > 0 || initialSettlements.length > 0;
    // Splitwise-style: you can leave once your per-currency net balance is
    // settled, even if the trip still references you in historical records.
    const userHasOpenBalance = useMemo(() =>
            initialBalances.balances.some(b => b.user.id === user.id && Math.abs(b.net) >= 0.01),
        [initialBalances, user.id]);

    const refreshTrip = async () => {
        if (!trip.id) return;
        const fresh = await getTripById(trip.id);
        setTrip(fresh);
    };

    const reportError = (err: unknown, fallback: string) => {
        const axiosErr = err as AxiosError<ApiError>;
        const status = axiosErr?.response?.status;
        const apiMessage = axiosErr?.response?.data?.error;
        setError(apiMessage || fallback);
        // Expected validation rejections (4xx with a server-provided message)
        // are already surfaced in the UI; logging them as errors trips the
        // Next.js dev overlay. Reserve console.error for the truly unexpected.
        if (status && status >= 400 && status < 500) {
            console.warn(fallback, axiosErr.response?.data ?? err);
        } else {
            console.error(fallback, err);
        }
    };

    const updateStatus = async (status: TripStatus) => {
        if (!trip.id) return;
        setBusy(true);
        setError(null);
        try {
            await updateTrip(toPutPayload({...trip, status}));
            await refreshTrip();
        } catch (err) {
            reportError(err, "Failed to update trip status.");
        } finally {
            setBusy(false);
        }
    };

    const handleLeave = async () => {
        if (!trip.id) return;
        if (!confirm("Leave this trip? You will need to be re-added to rejoin.")) return;
        const remaining = (trip.participants ?? []).filter(p => p.id !== user.id);
        setBusy(true);
        setError(null);
        try {
            await updateTrip(toPutPayload({...trip, participants: remaining}));
            await router.push("/trips");
        } catch (err) {
            reportError(err, "Failed to leave trip.");
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!trip.id) return;
        if (!confirm("Delete this trip? This cannot be undone.")) return;
        setBusy(true);
        setError(null);
        try {
            await deleteTrip(trip.id);
            await router.push("/trips");
        } catch (err) {
            reportError(err, "Failed to delete trip.");
            setBusy(false);
        }
    };

    const status = trip.status;
    const canComplete = status === TripStatus.Planned || status === TripStatus.InProgress;
    const canCancel = status !== TripStatus.Cancelled;
    const canReopen = status === TripStatus.Completed || status === TripStatus.Cancelled;

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

            {/* Action bar */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
                <button
                    onClick={() => setEditOpen(true)}
                    disabled={busy}
                    className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-100 rounded-lg text-sm transition-colors"
                >
                    <Pencil className="w-4 h-4 mr-2"/>
                    Edit
                </button>
                <button
                    onClick={() => setShareOpen(true)}
                    disabled={busy}
                    className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-100 rounded-lg text-sm transition-colors"
                >
                    <Share2 className="w-4 h-4 mr-2"/>
                    Share
                </button>
                {canComplete && (
                    <button
                        onClick={() => updateStatus(TripStatus.Completed)}
                        disabled={busy}
                        className="flex items-center px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2"/>
                        Mark complete
                    </button>
                )}
                {canReopen && (
                    <button
                        onClick={() => updateStatus(TripStatus.Planned)}
                        disabled={busy}
                        className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-100 rounded-lg text-sm transition-colors"
                    >
                        <RotateCcw className="w-4 h-4 mr-2"/>
                        Reopen
                    </button>
                )}
                {canCancel && (
                    <button
                        onClick={() => {
                            if (confirm("Cancel this trip?")) updateStatus(TripStatus.Cancelled);
                        }}
                        disabled={busy}
                        className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-100 rounded-lg text-sm transition-colors"
                    >
                        <XCircle className="w-4 h-4 mr-2"/>
                        Cancel trip
                    </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={handleLeave}
                        disabled={busy || userHasOpenBalance}
                        title={userHasOpenBalance ? "You have an open balance here — settle up first" : undefined}
                        className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-100 rounded-lg text-sm transition-colors"
                    >
                        <DoorOpen className="w-4 h-4 mr-2"/>
                        Leave
                    </button>
                    {isCreator && (
                        <button
                            onClick={handleDelete}
                            disabled={busy || tripHasAnyTies}
                            title={tripHasAnyTies ? "Trip has expenses — cancel it instead" : undefined}
                            className="flex items-center px-3 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                        >
                            <Trash2 className="w-4 h-4 mr-2"/>
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5"/>
                    <span className="flex-1">{error}</span>
                </div>
            )}

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

            <TripDialog
                isOpen={editOpen}
                onCloseAction={() => setEditOpen(false)}
                user={user}
                allUsers={allUsers}
                mode="edit"
                existingTrip={trip}
                onSavedAction={refreshTrip}
            />

            <ShareTripDialog
                isOpen={shareOpen}
                onCloseAction={() => setShareOpen(false)}
                trip={trip}
            />
        </div>
    );
}
