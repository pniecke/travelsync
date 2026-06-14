import {ExpenseShare, ExpenseShareType, User} from "@/types";

export const ROUNDING_TOLERANCE = 0.01;

export type SplitInputs = Record<string, string>;

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Split an amount equally, pushing any rounding remainder onto the first
 * participant so the shares always sum back to the exact amount. Mirrors the
 * backend's defaultEqualShares().
 */
export function buildEqualShares(participants: User[], amount: number): ExpenseShare[] {
    if (participants.length === 0) return [];
    const per = amount / participants.length;
    const rounded = participants.map(() => round2(per));
    const sum = rounded.reduce((s, v) => s + v, 0);
    const remainder = round2(amount - sum);
    rounded[0] = round2(rounded[0] + remainder);
    return participants.map((u, i) => ({
        user: u,
        amount: rounded[i],
        shareType: ExpenseShareType.Equal,
    }));
}

export function buildExactShares(participants: User[], inputs: SplitInputs): ExpenseShare[] {
    return participants.map(u => ({
        user: u,
        amount: parseFloat(inputs[u.id ?? ''] ?? '0') || 0,
        shareType: ExpenseShareType.Exact,
    }));
}

export function buildPercentShares(
    participants: User[],
    inputs: SplitInputs,
    amount: number,
): ExpenseShare[] {
    return participants.map(u => {
        const pct = parseFloat(inputs[u.id ?? ''] ?? '0') || 0;
        return {
            user: u,
            amount: round2((amount * pct) / 100),
            shareType: ExpenseShareType.Percent,
            shareValue: pct,
        };
    });
}

export function computeShares(
    mode: ExpenseShareType,
    participants: User[],
    inputs: SplitInputs,
    amount: number,
): ExpenseShare[] {
    if (mode === ExpenseShareType.Equal) return buildEqualShares(participants, amount);
    if (mode === ExpenseShareType.Exact) return buildExactShares(participants, inputs);
    return buildPercentShares(participants, inputs, amount);
}

export interface SplitSummary {
    sumAmounts: number;
    sumPercent: number;
}

export function summarizeSplit(
    computedShares: ExpenseShare[],
    participants: User[],
    inputs: SplitInputs,
): SplitSummary {
    const sumAmounts = computedShares.reduce((s, sh) => s + sh.amount, 0);
    const sumPercent = participants.reduce(
        (s, p) => s + (parseFloat(inputs[p.id ?? ''] ?? '0') || 0),
        0,
    );
    return {sumAmounts, sumPercent};
}

export interface SplitValidation {
    ok: boolean;
    message?: string;
}

export function validateSplit(
    mode: ExpenseShareType,
    participants: User[],
    amount: number,
    summary: SplitSummary,
): SplitValidation {
    if (participants.length === 0) {
        return {ok: false, message: "Select at least one person to split with"};
    }
    if (mode === ExpenseShareType.Exact) {
        if (Math.abs(summary.sumAmounts - amount) > ROUNDING_TOLERANCE) {
            return {
                ok: false,
                message: `Shares must sum to ${amount.toFixed(2)} (current: ${summary.sumAmounts.toFixed(2)})`,
            };
        }
    }
    if (mode === ExpenseShareType.Percent) {
        if (Math.abs(summary.sumPercent - 100) > ROUNDING_TOLERANCE) {
            return {
                ok: false,
                message: `Percentages must sum to 100 (current: ${summary.sumPercent.toFixed(2)})`,
            };
        }
    }
    return {ok: true};
}

/**
 * Seed the controlled split state from an expense's existing shares so the edit
 * UI opens pre-filled. Falls back to an equal split across all participants when
 * the expense has no shares yet.
 */
export function deriveSplitState(
    shares: ExpenseShare[] | undefined,
    allParticipants: User[],
): {mode: ExpenseShareType; participantIds: string[]; inputs: SplitInputs} {
    if (!shares || shares.length === 0) {
        return {
            mode: ExpenseShareType.Equal,
            participantIds: allParticipants.map(p => p.id ?? '').filter(Boolean),
            inputs: {},
        };
    }
    const mode = shares[0].shareType ?? ExpenseShareType.Equal;
    const participantIds = shares.map(s => s.user.id ?? '').filter(Boolean);
    const inputs: SplitInputs = {};
    shares.forEach(s => {
        const pid = s.user.id ?? '';
        if (!pid) return;
        if (mode === ExpenseShareType.Percent) {
            inputs[pid] = String(s.shareValue ?? '');
        } else if (mode === ExpenseShareType.Exact) {
            inputs[pid] = s.amount.toFixed(2);
        }
    });
    return {mode, participantIds, inputs};
}
