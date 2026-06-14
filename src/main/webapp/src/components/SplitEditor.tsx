'use client'

import {Currency, ExpenseShare, ExpenseShareType, User} from "@/types";
import {SplitInputs, SplitSummary, SplitValidation} from "@/utils/expenseShares";

interface SplitEditorProps {
    participants: User[];
    currentUserId?: string;
    amount: number;
    currency: Currency;
    splitMode: ExpenseShareType;
    onSplitModeChange: (mode: ExpenseShareType) => void;
    splitParticipantIds: string[];
    onToggleParticipant: (userId: string) => void;
    splitInputs: SplitInputs;
    onInputChange: (userId: string, value: string) => void;
    computedShares: ExpenseShare[];
    splitSummary: SplitSummary;
    splitValidation: SplitValidation;
    onSplitEvenly: () => void;
}

const MODES: Array<[ExpenseShareType, string]> = [
    [ExpenseShareType.Equal, 'Equal'],
    [ExpenseShareType.Exact, 'Exact'],
    [ExpenseShareType.Percent, 'Percent'],
];

/**
 * Controlled editor for how an expense is split among trip participants. Used
 * by both the create (ExpenseDialog) and edit (ExpenseEditDialog) flows; all
 * state lives in the parent and the split maths live in utils/expenseShares.
 */
export default function SplitEditor({
                                        participants,
                                        currentUserId,
                                        amount,
                                        currency,
                                        splitMode,
                                        onSplitModeChange,
                                        splitParticipantIds,
                                        onToggleParticipant,
                                        splitInputs,
                                        onInputChange,
                                        computedShares,
                                        splitSummary,
                                        splitValidation,
                                        onSplitEvenly,
                                    }: SplitEditorProps) {
    return (
        <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-300">
                    Split
                </label>
                <div className="inline-flex rounded-lg border border-gray-600 overflow-hidden text-xs">
                    {MODES.map(([mode, label]) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => onSplitModeChange(mode)}
                            className={`px-3 py-1 transition-colors ${
                                splitMode === mode
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                {participants.map(p => {
                    const pid = p.id ?? '';
                    const included = splitParticipantIds.includes(pid);
                    const share = computedShares.find(s => s.user.id === pid);
                    return (
                        <div
                            key={pid}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                                included ? 'border-blue-700 bg-gray-700/50' : 'border-gray-700 bg-gray-800'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={included}
                                onChange={() => onToggleParticipant(pid)}
                                className="h-4 w-4 accent-blue-500"
                            />
                            <span className="flex-1 text-sm text-gray-100">
                                {p.firstName || p.username}
                                {p.id === currentUserId && " (You)"}
                            </span>
                            {included && splitMode === ExpenseShareType.Equal && (
                                <span className="text-sm text-gray-300 tabular-nums">
                                    {(share?.amount ?? 0).toFixed(2)} {currency}
                                </span>
                            )}
                            {included && splitMode === ExpenseShareType.Exact && (
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={splitInputs[pid] ?? ''}
                                    onChange={(e) => onInputChange(pid, e.target.value)}
                                    className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-right text-gray-100"
                                />
                            )}
                            {included && splitMode === ExpenseShareType.Percent && (
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        placeholder="0"
                                        value={splitInputs[pid] ?? ''}
                                        onChange={(e) => onInputChange(pid, e.target.value)}
                                        className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-right text-gray-100"
                                    />
                                    <span className="text-xs text-gray-400">%</span>
                                    <span className="w-20 text-right text-xs text-gray-500 tabular-nums">
                                        ={(share?.amount ?? 0).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {(splitMode === ExpenseShareType.Exact || splitMode === ExpenseShareType.Percent) && (
                <div className="mt-2 flex items-center justify-between text-xs">
                    <button
                        type="button"
                        onClick={onSplitEvenly}
                        className="text-blue-400 hover:text-blue-300"
                    >
                        Split evenly
                    </button>
                    <span className={`tabular-nums ${splitValidation.ok ? 'text-gray-400' : 'text-amber-400'}`}>
                        {splitMode === ExpenseShareType.Exact
                            ? `${splitSummary.sumAmounts.toFixed(2)} / ${amount.toFixed(2)} ${currency}`
                            : `${splitSummary.sumPercent.toFixed(2)} / 100%`}
                    </span>
                </div>
            )}
        </div>
    );
}
