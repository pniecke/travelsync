import { Trip, TripStatus } from "@/types";

export interface TripBadge {
    label: string;
    classes: string;
}

export function tripBadge(trip: Trip): TripBadge {
    const now = Date.now();
    const start = new Date(trip.startTime).getTime();
    const end = trip.endTime ? new Date(trip.endTime).getTime() : null;

    if (trip.status === TripStatus.Cancelled) {
        return { label: "Cancelled", classes: "bg-gray-700 text-gray-300" };
    }
    if (trip.status === TripStatus.Completed) {
        return { label: "Completed", classes: "bg-emerald-700/40 text-emerald-300" };
    }
    if (start <= now && (end == null || now <= end)) {
        return { label: "Ongoing", classes: "bg-amber-600 text-white" };
    }
    if (start > now) {
        return { label: "Upcoming", classes: "bg-blue-600 text-white" };
    }
    return { label: "Past", classes: "bg-gray-700 text-gray-300" };
}

export function isActiveTrip(trip: Trip): boolean {
    return trip.status === TripStatus.Planned || trip.status === TripStatus.InProgress;
}

export function tripExpenseTotals(trip: Trip): Array<[string, number]> {
    const totals = (trip.expenses ?? []).reduce<Record<string, number>>((acc, e) => {
        acc[e.currency] = (acc[e.currency] ?? 0) + e.amount;
        return acc;
    }, {});
    return Object.entries(totals);
}
