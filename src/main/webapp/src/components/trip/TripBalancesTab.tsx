'use client'

import {useState} from "react";
import {ArrowRight, DollarSign, Handshake, Trash2} from "lucide-react";
import {
    Currency,
    Settlement,
    SuggestedSettlement,
    Trip,
    TripBalances,
    User,
} from "@/types";
import SettleUpDialog from "@/components/SettleUpDialog";
import {deleteSettlement, getTripBalances, getTripSettlements} from "@/services/splitService";
import {formatDate} from "@/utils/date";

interface TripBalancesTabProps {
    user: User;
    trip: Trip;
    initialBalances: TripBalances;
    initialSettlements: Settlement[];
}

function formatAmount(value: number, currency: Currency): string {
    const sign = value < 0 ? '-' : '';
    return `${sign}${Math.abs(value).toFixed(2)} ${currency}`;
}

function userName(u: User, currentUserId?: string): string {
    const base = u.firstName || u.username;
    return u.id === currentUserId ? `${base} (You)` : base;
}

export default function TripBalancesTab({
                                            user,
                                            trip,
                                            initialBalances,
                                            initialSettlements,
                                        }: TripBalancesTabProps) {
    const [balances, setBalances] = useState<TripBalances>(initialBalances);
    const [settlements, setSettlements] = useState<Settlement[]>(initialSettlements);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [prefill, setPrefill] = useState<SuggestedSettlement | null>(null);
    const [error, setError] = useState<string | null>(null);

    const refresh = async () => {
        if (!trip.id) return;
        try {
            const [b, s] = await Promise.all([
                getTripBalances(trip.id),
                getTripSettlements(trip.id),
            ]);
            setBalances(b);
            setSettlements(s);
        } catch (e) {
            console.error(e);
            setError("Failed to refresh balances");
        }
    };

    const openSettle = (suggestion?: SuggestedSettlement) => {
        setPrefill(suggestion ?? null);
        setDialogOpen(true);
    };

    const handleDeleteSettlement = async (id?: string) => {
        if (!trip.id || !id) return;
        if (!confirm('Delete this settlement?')) return;
        try {
            await deleteSettlement(trip.id, id);
            await refresh();
        } catch (e) {
            console.error(e);
            setError("Failed to delete settlement");
        }
    };

    const balancesByCurrency = balances.balances.reduce((acc, b) => {
        (acc[b.currency] ??= []).push(b);
        return acc;
    }, {} as Record<Currency, typeof balances.balances>);

    const suggestionsByCurrency = balances.suggestedSettlements.reduce((acc, s) => {
        (acc[s.currency] ??= []).push(s);
        return acc;
    }, {} as Record<Currency, SuggestedSettlement[]>);

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-end">
                <button
                    onClick={() => openSettle()}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-md"
                >
                    <Handshake className="w-4 h-4 mr-2"/>
                    Settle Up
                </button>
            </div>

            {/* Net balances */}
            <div className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-blue-400"/>
                    Net Balances
                </h2>
                {balances.balances.length === 0 ? (
                    <p className="text-gray-400 text-sm">
                        No balances yet — add an expense with a split to see who owes whom.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(balancesByCurrency).map(([cur, list]) => (
                            <div key={cur}>
                                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{cur}</h3>
                                <div className="divide-y divide-gray-700">
                                    {list
                                        .slice()
                                        .sort((a, b) => b.net - a.net)
                                        .map(b => (
                                            <div
                                                key={`${b.user.id}-${b.currency}`}
                                                className="flex items-center justify-between py-2"
                                            >
                                                <span className="text-gray-100">
                                                    {userName(b.user, user.id)}
                                                </span>
                                                <span
                                                    className={`tabular-nums font-medium ${
                                                        Math.abs(b.net) < 0.01
                                                            ? 'text-gray-400'
                                                            : b.net > 0
                                                                ? 'text-green-400'
                                                                : 'text-red-400'
                                                    }`}
                                                >
                                                    {Math.abs(b.net) < 0.01
                                                        ? 'settled'
                                                        : b.net > 0
                                                            ? `is owed ${formatAmount(b.net, b.currency)}`
                                                            : `owes ${formatAmount(Math.abs(b.net), b.currency)}`}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {balances.suggestedSettlements.length > 0 && (
                <div className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
                        <Handshake className="w-5 h-5 mr-2 text-blue-400"/>
                        Suggested Settlements
                    </h2>
                    <div className="space-y-4">
                        {Object.entries(suggestionsByCurrency).map(([cur, list]) => (
                            <div key={cur}>
                                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{cur}</h3>
                                <div className="space-y-2">
                                    {list.map((s, idx) => (
                                        <div
                                            key={`${s.fromUser.id}-${s.toUser.id}-${idx}`}
                                            className="flex items-center justify-between bg-gray-700/40 rounded-lg px-4 py-3"
                                        >
                                            <div className="flex items-center text-gray-100">
                                                <span>{userName(s.fromUser, user.id)}</span>
                                                <ArrowRight className="w-4 h-4 mx-2 text-gray-400"/>
                                                <span>{userName(s.toUser, user.id)}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="tabular-nums text-gray-100">
                                                    {formatAmount(s.amount, s.currency)}
                                                </span>
                                                <button
                                                    onClick={() => openSettle(s)}
                                                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                                                >
                                                    Record
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-100 mb-4">Settlement History</h2>
                {settlements.length === 0 ? (
                    <p className="text-gray-400 text-sm">No settlements recorded yet.</p>
                ) : (
                    <div className="divide-y divide-gray-700">
                        {settlements
                            .slice()
                            .sort((a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime())
                            .map(s => (
                                <div
                                    key={s.id}
                                    className="flex items-center justify-between py-3"
                                >
                                    <div>
                                        <div className="flex items-center text-gray-100">
                                            <span>{userName(s.fromUser, user.id)}</span>
                                            <ArrowRight className="w-4 h-4 mx-2 text-gray-400"/>
                                            <span>{userName(s.toUser, user.id)}</span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {formatDate(s.settledAt)}
                                            {s.note && ` • ${s.note}`}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="tabular-nums text-gray-100">
                                            {formatAmount(s.amount, s.currency)}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteSettlement(s.id)}
                                            className="text-gray-400 hover:text-red-400 transition-colors"
                                            title="Delete settlement"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            <SettleUpDialog
                isOpen={dialogOpen}
                onCloseAction={() => setDialogOpen(false)}
                trip={trip}
                currentUser={user}
                prefill={prefill}
                onSettledAction={refresh}
            />
        </div>
    );
}
