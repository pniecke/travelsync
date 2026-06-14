'use client'

import {X} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import {AxiosError} from "axios";
import {ApiError, Currency, Expense, ExpenseShare, ExpenseShareType, Trip, User} from "@/types";
import {updateExpense} from "@/services/expenseService";
import SplitEditor from "@/components/SplitEditor";
import {
    computeShares,
    deriveSplitState,
    SplitInputs,
    summarizeSplit,
    validateSplit,
} from "@/utils/expenseShares";

interface ExpenseEditDialogProps {
    isOpen: boolean;
    onCloseAction: () => void;
    user: User;
    trip: Trip;
    expense: Expense;
    onSavedAction: (updated: Expense) => void | Promise<void>;
    availableCurrencies?: Currency[];
}

// Backend resolves users by id; echoing full PII back trips @Valid, so send the
// minimal shape (matching the trip edit flow's toPutPayload).
const minimalUser = (u: User): User => ({id: u.id, username: u.username});

export default function ExpenseEditDialog({
                                              isOpen,
                                              onCloseAction: onClose,
                                              user,
                                              trip,
                                              expense,
                                              onSavedAction,
                                              availableCurrencies = [Currency.Chf, Currency.Eur, Currency.Usd],
                                          }: ExpenseEditDialogProps) {
    const participants = useMemo(() => trip.participants ?? [], [trip]);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(0);
    const [currency, setCurrency] = useState<Currency>(Currency.Chf);
    const [dateOfExpense, setDateOfExpense] = useState('');
    const [paidById, setPaidById] = useState<string | undefined>(undefined);

    const [splitMode, setSplitMode] = useState<ExpenseShareType>(ExpenseShareType.Equal);
    const [splitParticipantIds, setSplitParticipantIds] = useState<string[]>([]);
    const [splitInputs, setSplitInputs] = useState<SplitInputs>({});

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Re-seed the form from the expense whenever the dialog (re)opens.
    useEffect(() => {
        if (!isOpen) return;
        setDescription(expense.description ?? '');
        setAmount(expense.amount);
        setCurrency(expense.currency);
        setDateOfExpense((expense.dateOfExpense ?? '').slice(0, 16));
        setPaidById(expense.paidBy?.id);
        const seed = deriveSplitState(expense.shares, participants);
        setSplitMode(seed.mode);
        setSplitParticipantIds(seed.participantIds);
        setSplitInputs(seed.inputs);
        setError(null);
    }, [isOpen, expense, participants]);

    const splitParticipants: User[] = useMemo(
        () => participants.filter(p => splitParticipantIds.includes(p.id ?? '')),
        [participants, splitParticipantIds],
    );

    const computedShares: ExpenseShare[] = useMemo(
        () => computeShares(splitMode, splitParticipants, splitInputs, Number(amount) || 0),
        [splitMode, splitParticipants, splitInputs, amount],
    );

    const splitSummary = useMemo(
        () => summarizeSplit(computedShares, splitParticipants, splitInputs),
        [computedShares, splitInputs, splitParticipants],
    );

    const splitValidation = useMemo(
        () => validateSplit(splitMode, splitParticipants, Number(amount) || 0, splitSummary),
        [splitMode, splitParticipants, amount, splitSummary],
    );

    const toggleSplitParticipant = (userId: string) => {
        setSplitParticipantIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId],
        );
    };

    const updateSplitInput = (userId: string, value: string) => {
        setSplitInputs(prev => ({...prev, [userId]: value}));
    };

    const distributeRemainderEvenly = () => {
        if (splitParticipants.length === 0) return;
        const next: SplitInputs = {};
        if (splitMode === ExpenseShareType.Exact) {
            const per = (Number(amount) || 0) / splitParticipants.length;
            splitParticipants.forEach(p => {
                next[p.id ?? ''] = per.toFixed(2);
            });
        } else if (splitMode === ExpenseShareType.Percent) {
            const per = 100 / splitParticipants.length;
            splitParticipants.forEach(p => {
                next[p.id ?? ''] = per.toFixed(2);
            });
        }
        setSplitInputs(next);
    };

    const handleSave = async () => {
        if (!description) {
            setError("Please enter a description");
            return;
        }
        if (!amount || amount <= 0) {
            setError("Please enter a positive amount");
            return;
        }
        if (!splitValidation.ok) {
            setError(splitValidation.message ?? "Invalid split");
            return;
        }
        if (!expense.id) {
            setError("Expense is missing an id");
            return;
        }
        setError(null);
        setIsSubmitting(true);
        try {
            const payer = participants.find(p => p.id === paidById);
            const payload: Expense = {
                ...expense,
                description,
                amount: Number(amount),
                currency,
                dateOfExpense,
                paidBy: payer ? minimalUser(payer) : undefined,
                shares: computedShares.map(s => ({...s, user: minimalUser(s.user)})),
            };
            const updated = await updateExpense(expense.id, payload);
            await onSavedAction(updated);
            onClose();
        } catch (err) {
            const apiMessage = (err as AxiosError<ApiError>)?.response?.data?.error;
            setError(apiMessage || "Failed to save changes. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-100">Edit Expense</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Description *
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Amount *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                    value={amount || ''}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setAmount(isNaN(v) ? 0 : v);
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Currency
                                </label>
                                <select
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                    value={currency}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (Object.values(Currency).includes(v as Currency)) {
                                            setCurrency(v as Currency);
                                        }
                                    }}
                                >
                                    {availableCurrencies.map(c => (
                                        <option key={c} value={c} className="bg-gray-800">{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Date
                            </label>
                            <input
                                type="datetime-local"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                value={dateOfExpense}
                                onChange={(e) => setDateOfExpense(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Paid By
                            </label>
                            <select
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                value={paidById ?? ''}
                                onChange={(e) => setPaidById(e.target.value || undefined)}
                            >
                                {participants.map(p => (
                                    <option key={p.id} value={p.id} className="bg-gray-800">
                                        {p.firstName || p.username}
                                        {p.id === user.id && " (You)"}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <SplitEditor
                            participants={participants}
                            currentUserId={user.id}
                            amount={Number(amount) || 0}
                            currency={currency}
                            splitMode={splitMode}
                            onSplitModeChange={(mode) => {
                                setSplitMode(mode);
                                setSplitInputs({});
                            }}
                            splitParticipantIds={splitParticipantIds}
                            onToggleParticipant={toggleSplitParticipant}
                            splitInputs={splitInputs}
                            onInputChange={updateSplitInput}
                            computedShares={computedShares}
                            splitSummary={splitSummary}
                            splitValidation={splitValidation}
                            onSplitEvenly={distributeRemainderEvenly}
                        />
                    </div>

                    {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}

                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className={`px-4 py-2 rounded-lg text-white ${
                                isSubmitting ? 'bg-gray-600 text-gray-400' : 'bg-blue-600 hover:bg-blue-500'
                            } transition-colors`}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
