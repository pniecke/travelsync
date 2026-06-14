import {describe, expect, it} from "vitest";
import {ExpenseShareType, User} from "@/types";
import {
    buildEqualShares,
    buildExactShares,
    buildPercentShares,
    computeShares,
    deriveSplitState,
    ROUNDING_TOLERANCE,
    summarizeSplit,
    validateSplit,
} from "@/utils/expenseShares";

const u = (id: string, username = id): User => ({id, username});
const alice = u("a", "alice");
const bob = u("b", "bob");
const carol = u("c", "carol");

describe("buildEqualShares", () => {
    it("splits evenly when it divides cleanly", () => {
        const shares = buildEqualShares([alice, bob], 100);
        expect(shares.map(s => s.amount)).toEqual([50, 50]);
        expect(shares.every(s => s.shareType === ExpenseShareType.Equal)).toBe(true);
    });

    it("pushes the rounding remainder onto the first participant so the sum is exact", () => {
        const shares = buildEqualShares([alice, bob, carol], 100);
        // 100/3 = 33.33 each; first absorbs the 0.01 remainder.
        expect(shares.map(s => s.amount)).toEqual([33.34, 33.33, 33.33]);
        expect(shares.reduce((s, x) => s + x.amount, 0)).toBeCloseTo(100, 5);
    });

    it("returns an empty array for no participants", () => {
        expect(buildEqualShares([], 100)).toEqual([]);
    });

    it("assigns the full amount to a single participant", () => {
        expect(buildEqualShares([alice], 75.5).map(s => s.amount)).toEqual([75.5]);
    });
});

describe("buildExactShares", () => {
    it("reads each participant's typed amount, defaulting blanks to 0", () => {
        const shares = buildExactShares([alice, bob], {a: "70", b: ""});
        expect(shares).toEqual([
            {user: alice, amount: 70, shareType: ExpenseShareType.Exact},
            {user: bob, amount: 0, shareType: ExpenseShareType.Exact},
        ]);
    });

    it("treats non-numeric input as 0", () => {
        expect(buildExactShares([alice], {a: "abc"})[0].amount).toBe(0);
    });
});

describe("buildPercentShares", () => {
    it("converts percentages into amounts and records the shareValue", () => {
        const shares = buildPercentShares([alice, bob], {a: "25", b: "75"}, 200);
        expect(shares).toEqual([
            {user: alice, amount: 50, shareType: ExpenseShareType.Percent, shareValue: 25},
            {user: bob, amount: 150, shareType: ExpenseShareType.Percent, shareValue: 75},
        ]);
    });

    it("rounds computed amounts to 2 decimals", () => {
        const shares = buildPercentShares([alice], {a: "33.333"}, 100);
        expect(shares[0].amount).toBe(33.33);
    });
});

describe("computeShares", () => {
    it("dispatches to the right builder per mode", () => {
        expect(computeShares(ExpenseShareType.Equal, [alice, bob], {}, 100).map(s => s.amount)).toEqual([50, 50]);
        expect(computeShares(ExpenseShareType.Exact, [alice], {a: "10"}, 100)[0].amount).toBe(10);
        expect(computeShares(ExpenseShareType.Percent, [alice], {a: "50"}, 100)[0].amount).toBe(50);
    });
});

describe("summarizeSplit", () => {
    it("sums computed amounts and raw percent inputs", () => {
        const inputs = {a: "30", b: "70"};
        const shares = buildPercentShares([alice, bob], inputs, 100);
        const summary = summarizeSplit(shares, [alice, bob], inputs);
        expect(summary.sumAmounts).toBeCloseTo(100, 5);
        expect(summary.sumPercent).toBe(100);
    });
});

describe("validateSplit", () => {
    const summary = (sumAmounts: number, sumPercent: number) => ({sumAmounts, sumPercent});

    it("fails with no participants", () => {
        expect(validateSplit(ExpenseShareType.Equal, [], 100, summary(0, 0)).ok).toBe(false);
    });

    it("equal split is always valid once someone is selected", () => {
        expect(validateSplit(ExpenseShareType.Equal, [alice], 100, summary(100, 0)).ok).toBe(true);
    });

    it("exact split must sum to the amount", () => {
        expect(validateSplit(ExpenseShareType.Exact, [alice, bob], 100, summary(90, 0)).ok).toBe(false);
        expect(validateSplit(ExpenseShareType.Exact, [alice, bob], 100, summary(100, 0)).ok).toBe(true);
    });

    it("exact split tolerates sub-cent rounding drift", () => {
        expect(validateSplit(ExpenseShareType.Exact, [alice], 100, summary(100 + ROUNDING_TOLERANCE / 2, 0)).ok).toBe(true);
    });

    it("percent split must sum to 100", () => {
        expect(validateSplit(ExpenseShareType.Percent, [alice], 100, summary(100, 90)).ok).toBe(false);
        expect(validateSplit(ExpenseShareType.Percent, [alice, bob], 100, summary(100, 100)).ok).toBe(true);
    });

    it("surfaces a helpful message on mismatch", () => {
        const res = validateSplit(ExpenseShareType.Exact, [alice], 100, summary(40, 0));
        expect(res.message).toContain("100.00");
        expect(res.message).toContain("40.00");
    });
});

describe("deriveSplitState", () => {
    it("defaults to an equal split across all participants when there are no shares", () => {
        const state = deriveSplitState(undefined, [alice, bob]);
        expect(state.mode).toBe(ExpenseShareType.Equal);
        expect(state.participantIds).toEqual(["a", "b"]);
        expect(state.inputs).toEqual({});
    });

    it("seeds EXACT inputs from existing share amounts", () => {
        const state = deriveSplitState(
            [
                {user: alice, amount: 70, shareType: ExpenseShareType.Exact},
                {user: bob, amount: 30, shareType: ExpenseShareType.Exact},
            ],
            [alice, bob, carol],
        );
        expect(state.mode).toBe(ExpenseShareType.Exact);
        expect(state.participantIds).toEqual(["a", "b"]);
        expect(state.inputs).toEqual({a: "70.00", b: "30.00"});
    });

    it("seeds PERCENT inputs from shareValue", () => {
        const state = deriveSplitState(
            [
                {user: alice, amount: 50, shareType: ExpenseShareType.Percent, shareValue: 50},
                {user: bob, amount: 50, shareType: ExpenseShareType.Percent, shareValue: 50},
            ],
            [alice, bob],
        );
        expect(state.mode).toBe(ExpenseShareType.Percent);
        expect(state.inputs).toEqual({a: "50", b: "50"});
    });

    it("leaves inputs empty for an EQUAL split but keeps the selected participants", () => {
        const state = deriveSplitState(
            [
                {user: alice, amount: 50, shareType: ExpenseShareType.Equal},
                {user: bob, amount: 50, shareType: ExpenseShareType.Equal},
            ],
            [alice, bob, carol],
        );
        expect(state.mode).toBe(ExpenseShareType.Equal);
        expect(state.participantIds).toEqual(["a", "b"]);
        expect(state.inputs).toEqual({});
    });
});
