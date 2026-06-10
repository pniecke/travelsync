'use client'

import {GetServerSideProps} from "next";
import Link from "next/link";
import {useMemo, useState} from "react";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Filter,
    MapPin,
    Plus,
    Search,
    Users,
    X,
} from "lucide-react";

import {Trip, User} from "@/types";
import {createServerApiClient} from "@/services/apiClient";
import {getLoggedInUser} from "@/services/userService";
import {getMyTrips} from "@/services/tripService";
import {formatDate} from "@/utils/date";
import {tripBadge, tripExpenseTotals} from "@/utils/trip";
import TripDialog from "@/components/TripDialog";

const PAGE_SIZE = 20;

type StatusFilter = "all" | "Upcoming" | "Ongoing" | "Past" | "Completed" | "Cancelled";
type SortKey = "startDate" | "name";
type SortDirection = "asc" | "desc";

interface TripsPageProps {
    user: User;
    trips: Trip[];
    allUsers: User[];
}

export const getServerSideProps: GetServerSideProps<TripsPageProps> = async (ctx) => {
    const cookieHeader = ctx.req.headers.cookie;
    if (!cookieHeader) {
        return {redirect: {destination: '/login', permanent: false}};
    }
    const ssrClient = createServerApiClient(cookieHeader);
    try {
        const [user, trips, allUsersRes] = await Promise.all([
            getLoggedInUser(ssrClient),
            getMyTrips(ssrClient),
            ssrClient.get<User[]>('/users'),
        ]);
        const allUsers = allUsersRes.data.filter(u => u.id !== user.id);
        return {props: {user, trips, allUsers}};
    } catch (e) {
        console.error("Error loading trips page:", e);
        return {redirect: {destination: '/login', permanent: false}};
    }
};

function TripCard({trip}: { trip: Trip }) {
    const badge = tripBadge(trip);
    const totals = tripExpenseTotals(trip);
    return (
        <Link
            href={`/trips/${trip.id}`}
            className="block bg-gray-800 rounded-xl shadow-md border border-gray-700 hover:border-blue-500 transition-colors overflow-hidden"
        >
            <div className="p-5 border-b border-gray-700">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-gray-100 truncate">
                            {trip.name || trip.destination}
                        </h3>
                        {trip.name && (
                            <div className="flex items-center text-gray-400 mt-1">
                                <MapPin className="w-4 h-4 mr-1 shrink-0"/>
                                <span className="text-sm truncate">{trip.destination}</span>
                            </div>
                        )}
                    </div>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${badge.classes}`}>
                        {badge.label}
                    </span>
                </div>
            </div>
            <div className="p-5 space-y-3">
                <div className="flex items-center text-gray-400 text-sm">
                    <Calendar className="w-4 h-4 mr-1 shrink-0"/>
                    <span className="truncate">
                        {formatDate(trip.startTime)}
                        {trip.endTime && ` – ${formatDate(trip.endTime)}`}
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-300">
                    <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1 text-gray-400"/>
                        {trip.participants?.length ?? 0}
                    </span>
                    <span className="flex items-center text-right tabular-nums">
                        <DollarSign className="w-4 h-4 mr-1 text-gray-400"/>
                        {totals.length === 0
                            ? "—"
                            : totals.map(([cur, sum]) => `${sum.toFixed(0)} ${cur}`).join(" + ")}
                    </span>
                </div>
            </div>
        </Link>
    );
}

export default function TripsListPage({user, trips: initialTrips, allUsers}: TripsPageProps) {
    const [trips, setTrips] = useState<Trip[]>(initialTrips);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [participantFilter, setParticipantFilter] = useState<string>("all");
    const [startFrom, setStartFrom] = useState<string>("");
    const [startTo, setStartTo] = useState<string>("");
    const [sortKey, setSortKey] = useState<SortKey>("startDate");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [page, setPage] = useState(0);

    // Build participant filter options from union of all participants across
    // visible trips; self is shown first.
    const participantOptions = useMemo(() => {
        const seen = new Map<string, User>();
        trips.forEach(t => t.participants?.forEach(p => {
            if (p.id && !seen.has(p.id)) seen.set(p.id, p);
        }));
        const all = Array.from(seen.values());
        const self = all.find(p => p.id === user.id);
        const others = all.filter(p => p.id !== user.id)
            .sort((a, b) => (a.firstName || a.username).localeCompare(b.firstName || b.username));
        return self ? [self, ...others] : others;
    }, [trips, user.id]);

    const filteredTrips = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const fromTime = startFrom ? new Date(startFrom).getTime() : null;
        const toTime = startTo ? new Date(startTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

        return trips.filter(t => {
            if (needle) {
                const haystack = `${t.name ?? ""} ${t.destination} ${t.description ?? ""}`.toLowerCase();
                if (!haystack.includes(needle)) return false;
            }
            if (statusFilter !== "all" && tripBadge(t).label !== statusFilter) return false;
            if (participantFilter !== "all" && !(t.participants?.some(p => p.id === participantFilter))) return false;
            const start = new Date(t.startTime).getTime();
            if (fromTime != null && start < fromTime) return false;
            if (toTime != null && start > toTime) return false;
            return true;
        });
    }, [trips, search, statusFilter, participantFilter, startFrom, startTo]);

    const sortedTrips = useMemo(() => {
        const sorted = [...filteredTrips];
        sorted.sort((a, b) => {
            let cmp = 0;
            if (sortKey === "startDate") {
                cmp = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            } else {
                const an = (a.name || a.destination).toLowerCase();
                const bn = (b.name || b.destination).toLowerCase();
                cmp = an.localeCompare(bn);
            }
            return sortDirection === "asc" ? cmp : -cmp;
        });
        return sorted;
    }, [filteredTrips, sortKey, sortDirection]);

    const totalPages = Math.max(1, Math.ceil(sortedTrips.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const pageTrips = sortedTrips.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

    const resetFilters = () => {
        setSearch("");
        setStatusFilter("all");
        setParticipantFilter("all");
        setStartFrom("");
        setStartTo("");
        setPage(0);
    };

    const hasActiveFilter =
        search.trim() !== "" ||
        statusFilter !== "all" ||
        participantFilter !== "all" ||
        startFrom !== "" ||
        startTo !== "";

    const refreshTrips = async () => {
        const updated = await getMyTrips();
        setTrips(updated);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8 flex items-start justify-between gap-4">
                <div className="pl-4 border-l-4 border-blue-500">
                    <h1 className="text-3xl font-bold text-gray-100 mb-2">Your Trips</h1>
                    <p className="text-gray-300 font-medium">
                        {sortedTrips.length} trip{sortedTrips.length !== 1 ? "s" : ""}
                        {hasActiveFilter && ` matching filters (of ${trips.length} total)`}
                    </p>
                </div>
                <button
                    onClick={() => setDialogOpen(true)}
                    className="shrink-0 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-md"
                >
                    <Plus className="w-4 h-4 mr-2"/>
                    Create Trip
                </button>
            </div>

            {/* Filter bar */}
            <div className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400"/>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100 placeholder-gray-400"
                            placeholder="Search by name, destination, description…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-blue-500 focus:border-blue-500"
                            value={`${sortKey}:${sortDirection}`}
                            onChange={(e) => {
                                const [k, d] = e.target.value.split(":") as [SortKey, SortDirection];
                                setSortKey(k);
                                setSortDirection(d);
                            }}
                        >
                            <option value="startDate:desc" className="bg-gray-800">Start date (newest)</option>
                            <option value="startDate:asc" className="bg-gray-800">Start date (oldest)</option>
                            <option value="name:asc" className="bg-gray-800">Name (A–Z)</option>
                            <option value="name:desc" className="bg-gray-800">Name (Z–A)</option>
                        </select>

                        <button
                            onClick={() => setFiltersVisible(v => !v)}
                            className="flex items-center justify-center px-4 py-2 border border-gray-600 rounded-lg text-gray-200 hover:bg-gray-700 transition-colors"
                        >
                            <Filter className="w-4 h-4 mr-2"/>
                            Filters
                        </button>
                    </div>
                </div>

                {filtersVisible && (
                    <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                            <select
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(0); }}
                            >
                                <option value="all" className="bg-gray-800">All</option>
                                <option value="Upcoming" className="bg-gray-800">Upcoming</option>
                                <option value="Ongoing" className="bg-gray-800">Ongoing</option>
                                <option value="Completed" className="bg-gray-800">Completed</option>
                                <option value="Cancelled" className="bg-gray-800">Cancelled</option>
                                <option value="Past" className="bg-gray-800">Past</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Participant</label>
                            <select
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                                value={participantFilter}
                                onChange={(e) => { setParticipantFilter(e.target.value); setPage(0); }}
                            >
                                <option value="all" className="bg-gray-800">Anyone</option>
                                {participantOptions.map(p => (
                                    <option key={p.id} value={p.id} className="bg-gray-800">
                                        {p.firstName || p.username}
                                        {p.id === user.id && " (You)"}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Start from</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                                value={startFrom}
                                onChange={(e) => { setStartFrom(e.target.value); setPage(0); }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Start to</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                                value={startTo}
                                onChange={(e) => { setStartTo(e.target.value); setPage(0); }}
                            />
                        </div>

                        {hasActiveFilter && (
                            <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                                <button
                                    onClick={resetFilters}
                                    className="flex items-center text-blue-400 hover:text-blue-300 text-sm transition-colors"
                                >
                                    <X className="w-4 h-4 mr-1"/>
                                    Reset filters
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Grid */}
            {trips.length === 0 ? (
                <div className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-10 text-center">
                    <h2 className="text-xl font-bold text-gray-100 mb-2">No trips yet</h2>
                    <p className="text-gray-400 mb-4">Create your first trip to get started.</p>
                    <button
                        onClick={() => setDialogOpen(true)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-2"/>
                        Create Trip
                    </button>
                </div>
            ) : sortedTrips.length === 0 ? (
                <div className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-10 text-center">
                    <p className="text-gray-400 mb-4">No trips match your filters.</p>
                    <button
                        onClick={resetFilters}
                        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                        Clear all filters
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pageTrips.map(trip => (
                            <TripCard key={trip.id} trip={trip}/>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                            <p className="text-sm text-gray-400">
                                Page {safePage + 1} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={safePage === 0}
                                    className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1"/>
                                    Prev
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={safePage >= totalPages - 1}
                                    className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-1"/>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <TripDialog
                isOpen={dialogOpen}
                onCloseAction={() => setDialogOpen(false)}
                user={user}
                allUsers={allUsers}
                onSavedAction={refreshTrips}
            />
        </div>
    );
}
