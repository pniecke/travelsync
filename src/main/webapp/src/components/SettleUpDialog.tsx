'use client'

import {X} from "lucide-react";
import {useEffect, useState} from "react";
import {Currency, SuggestedSettlement, Trip, User} from "@/types";
import {createSettlement} from "@/services/splitService";

interface SettleUpDialogProps {
    isOpen: boolean;
    onCloseAction: () => void;
    trip: Trip;
    currentUser: User;
    prefill?: SuggestedSettlement | null;
    onSettledAction: () => Promise<void>;
}

export default function SettleUpDialog({
                                           isOpen,
                                           onCloseAction,
                                           trip,
                                           currentUser,
                                           prefill,
                                           onSettledAction,
                                       }: SettleUpDialogProps) {
    const [fromUserId, setFromUserId] = useState<string>('');
    const [toUserId, setToUserId] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [currency, setCurrency] = useState<Currency>(Currency.Chf);
    const [note, setNote] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        if (prefill) {
            setFromUserId(prefill.fromUser.id ?? '');
            setToUserId(prefill.toUser.id ?? '');
            setAmount(prefill.amount.toFixed(2));
            setCurrency(prefill.currency);
        } else {
            setFromUserId(currentUser.id ?? '');
            setToUserId('');
            setAmount('');
            setCurrency(Currency.Chf);
        }
        setNote('');
        setError(null);
    }, [isOpen, prefill, currentUser]);

    if (!isOpen) return null;

    const participants = trip.participants ?? [];

    const handleSubmit = async () => {
        const numAmount = parseFloat(amount);
        if (!fromUserId || !toUserId) {
            setError('Select both users');
            return;
        }
        if (fromUserId === toUserId) {
            setError("'From' and 'To' must differ");
            return;
        }
        if (!numAmount || numAmount <= 0) {
            setError('Enter a positive amount');
            return;
        }
        if (!trip.id) return;

        setSubmitting(true);
        setError(null);
        try {
            await createSettlement(trip.id, {
                fromUserId,
                toUserId,
                amount: numAmount,
                currency,
                note: note.trim() || undefined,
            });
            await onSettledAction();
            onCloseAction();
        } catch (e) {
            console.error(e);
            setError('Failed to record settlement');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 w-full max-w-md">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-100">Record Settlement</h3>
                        <button
                            onClick={onCloseAction}
                            className="text-gray-400 hover:text-gray-300"
                        >
                            <X className="w-5 h-5"/>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">From</label>
                                <select
                                    value={fromUserId}
                                    onChange={(e) => setFromUserId(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100"
                                >
                                    <option value="">Select…</option>
                                    {participants.map(p => (
                                        <option key={p.id} value={p.id} className="bg-gray-800">
                                            {p.firstName || p.username}{p.id === currentUser.id && ' (You)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">To</label>
                                <select
                                    value={toUserId}
                                    onChange={(e) => setToUserId(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100"
                                >
                                    <option value="">Select…</option>
                                    {participants.map(p => (
                                        <option key={p.id} value={p.id} className="bg-gray-800">
                                            {p.firstName || p.username}{p.id === currentUser.id && ' (You)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value as Currency)}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100"
                                >
                                    {Object.values(Currency).map(c => (
                                        <option key={c} value={c} className="bg-gray-800">{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Note (optional)</label>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="e.g. Cash, Revolut, etc."
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100"
                            />
                        </div>
                    </div>

                    {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}

                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            onClick={onCloseAction}
                            className="px-4 py-2 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={`px-4 py-2 rounded-lg text-white ${
                                submitting ? 'bg-gray-600 text-gray-400' : 'bg-blue-600 hover:bg-blue-500'
                            } transition-colors`}
                        >
                            {submitting ? 'Recording…' : 'Record Settlement'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
