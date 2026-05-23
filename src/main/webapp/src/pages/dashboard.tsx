'use client'

import {Calendar, Check, DollarSign, LogOut, MapPin, Plus, Search, Settings, Shield, UserPlus, Users, X} from "lucide-react";
import React, {useEffect, useState} from "react";
import {Expense, Trip, TripStatus, User, UserRole} from "@/types";
import {createTrip, getMyTrips} from "@/services/tripService";
import {GetServerSideProps} from "next";
import {createServerApiClient} from "@/services/apiClient";
import Link from "next/link";
import {getExpenses} from "@/services/expenseService";
import ExpenseDialog from "@/components/ExpenseDialog";
import {formatDate} from "@/utils/date";
import {useAuth} from "@/context/AuthProvider";

function TripRow({
                     trip,
                     badge,
                     totals,
                 }: {
    trip: Trip;
    badge: { label: string; classes: string };
    totals: Array<[string, number]>;
}) {
    return (
        <Link
            href={`/trips/${trip.id}/balances`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-700/40 transition-colors"
        >
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-100 truncate">
                        {trip.name || trip.destination}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.classes}`}>
                        {badge.label}
                    </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {trip.name && `${trip.destination} • `}
                    {formatDate(trip.startTime)}
                    {trip.endTime && ` – ${formatDate(trip.endTime)}`}
                </p>
            </div>
            <div className="text-right text-xs text-gray-400 shrink-0">
                <div>{trip.participants?.length ?? 0} ppl</div>
                <div className="tabular-nums">
                    {totals.length === 0
                        ? '—'
                        : totals.map(([cur, sum]) => `${sum.toFixed(0)} ${cur}`).join(' + ')}
                </div>
            </div>
        </Link>
    );
}

interface DashboardProps {
    user: User
    trips: Trip[]
    myExpenses: Expense[],
    expensesPaidByMe?: Expense[],
    allUsers: User[]
}

interface UserSearchResult extends User {
    selected?: boolean
}

export const getServerSideProps: GetServerSideProps<DashboardProps> = async (ctx) => {
    const cookieHeader = ctx.req.headers.cookie
    if (!cookieHeader) {
        return {redirect: {destination: '/login', permanent: false}}
    }
    const ssrClient = createServerApiClient(cookieHeader)

    try {
        const [userRes, tripsRes, expensesRes, allUsersRes] = await Promise.all([
            ssrClient.get('/user/me'),
            ssrClient.get('/trips/my-trips'),
            ssrClient.get('/expenses'),
            ssrClient.get('/users'),
        ]);

        const user: User = userRes.data;
        const trips: Trip[] = tripsRes.data;
        const expenses: Expense[] = expensesRes.data;
        const allUsers: User[] = allUsersRes.data;

        const filteredUsers = allUsers.filter(u => u.id !== user.id);
        const myExpenses = expenses.filter(expense => expense.createdBy.id === user.id);
        const expensesPaidByMe = expenses.filter(expense => expense.paidBy?.id === user.id);
        return {props: {user, trips, myExpenses, expensesPaidByMe, allUsers: filteredUsers}}
    } catch (error) {
        console.error("Error fetching data:", error);
        // If any call fails (e.g., 401), redirect to log in
        return {
            redirect: {destination: '/login', permanent: false}
        }
    }
}

export default function Dashboard({
                                      user,
                                      trips: initialTrips,
                                      myExpenses: initialMyExpenses,
                                      expensesPaidByMe: initialExpensesPaidByMe,
                                      allUsers: initialAllUsers
                                  }: DashboardProps) {
    const {logout} = useAuth();
    const [trips, setTrips] = useState<Trip[]>(initialTrips);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [tripForm, setTripForm] = useState<Trip>({
        name: '',
        destination: '',
        description: '',
        startTime: new Date().toISOString().slice(0, 16),
        endTime: '',
        participants: [user],
        status: TripStatus.Planned,
    });
    const [allUsers] = useState<User[]>(initialAllUsers);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [selectedParticipants, setSelectedParticipants] = useState<User[]>([user]);
    const [myExpenses, setMyExpenses] = useState<Expense[]>(initialMyExpenses);
    const [expensesPaidByMe, setExpensesPaidByMe] = useState<Expense[]>(initialExpensesPaidByMe || []);
    const [showExpenseDialog, setShowExpenseDialog] = useState(false);

    const handleLogout = async () => {
        await logout();
    };

    const [tripSearchQuery, setTripSearchQuery] = useState('');

    const isActive = (trip: Trip) =>
        trip.status === TripStatus.Planned || trip.status === TripStatus.InProgress;

    const tripBadge = (trip: Trip): { label: string; classes: string } => {
        const now = Date.now();
        const start = new Date(trip.startTime).getTime();
        const end = trip.endTime ? new Date(trip.endTime).getTime() : null;
        if (trip.status === TripStatus.Cancelled) {
            return {label: 'Cancelled', classes: 'bg-gray-700 text-gray-300'};
        }
        if (trip.status === TripStatus.Completed) {
            return {label: 'Completed', classes: 'bg-emerald-700/40 text-emerald-300'};
        }
        if (start <= now && (end == null || now <= end)) {
            return {label: 'Ongoing', classes: 'bg-amber-600 text-white'};
        }
        if (start > now) {
            return {label: 'Upcoming', classes: 'bg-blue-600 text-white'};
        }
        return {label: 'Past', classes: 'bg-gray-700 text-gray-300'};
    };

    const matchesQuery = (trip: Trip, q: string): boolean => {
        if (!q) return true;
        const needle = q.toLowerCase();
        return (
            (trip.name?.toLowerCase().includes(needle) ?? false) ||
            trip.destination.toLowerCase().includes(needle) ||
            (trip.description?.toLowerCase().includes(needle) ?? false)
        );
    };

    const filteredTrips = trips.filter(t => matchesQuery(t, tripSearchQuery));
    const activeTrips = filteredTrips
        .filter(isActive)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const pastTrips = filteredTrips
        .filter(t => !isActive(t))
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    const featuredTrip = activeTrips[0];

    const tripExpenseTotals = (trip: Trip): Array<[string, number]> => {
        const totals = (trip.expenses ?? []).reduce<Record<string, number>>((acc, e) => {
            acc[e.currency] = (acc[e.currency] ?? 0) + e.amount;
            return acc;
        }, {});
        return Object.entries(totals);
    };

    const totalExpensesPaidByMe = expensesPaidByMe?.reduce((acc, expense) => acc + expense.amount, 0) || 0;

    const handleCreateTrip = async () => {
        setIsCreating(true);
        setError(null);

        try {
            const trimmedName = tripForm.name?.trim();
            const trimmedDescription = tripForm.description?.trim();
            // Strip PII from participants — backend only resolves by id, and
            // empty strings on optional pattern-validated fields (e.g. mobile)
            // would fail @Valid on the request body.
            const participantRefs = selectedParticipants.map(p => ({
                id: p.id,
                username: p.username,
            } as User));
            const newTrips: Trip[] = [{
                participants: participantRefs,
                ...(trimmedName ? {name: trimmedName} : {}),
                destination: tripForm.destination,
                startTime: tripForm.startTime,
                ...(tripForm.endTime ? {endTime: tripForm.endTime} : {}),
                ...(trimmedDescription ? {description: trimmedDescription} : {}),
                status: TripStatus.Planned,
            }];

            await createTrip(newTrips);
            const updatedTrips = await getMyTrips();

            setTrips(updatedTrips);
            setIsDialogOpen(false);
            setTripForm({
                participants: [user],
                name: '',
                destination: '',
                startTime: new Date().toISOString().slice(0, 16),
                endTime: '',
                description: '',
                status: TripStatus.Planned,
            });
            setSelectedParticipants([user]);
        } catch (err) {
            setError("Failed to create trip. Please try again.");
            console.error("Error creating trip:", err);
        } finally {
            setIsCreating(false);
        }
    }

    const refreshExpenses = async () => {
        const updatedExpenses = await getExpenses();
        const myUpdatedExpenses = updatedExpenses.filter(expense => expense.createdBy.id === user.id);
        const updatedExpensesPaidByMe = updatedExpenses.filter(expense => expense.paidBy?.id === user.id);

        setMyExpenses(myUpdatedExpenses);
        setExpensesPaidByMe(updatedExpensesPaidByMe);
        const updatedTrips = await getMyTrips();
        setTrips(updatedTrips);
    }

    // Search users based on a query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setSearchResults([]);
            return;
        }

        const results = allUsers.filter(user =>
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(user => ({
            ...user,
            selected: selectedParticipants.some(p => p.id === user.id)
        }));
        setSearchResults(results);
    }, [searchQuery, allUsers, selectedParticipants]);

    const toggleParticipant = (user: User) => {
        setSelectedParticipants(prev => {
            const exists = prev.some(p => p.id === user.id);
            if (exists) {
                return prev.filter(p => p.id !== user.id);
            } else {
                return [...prev, user];
            }
        });
        setSearchQuery('') // Clear search after selection
    };

    const handleOpenExpenseDialog = () => {
        if (trips.length === 0) {
            setError("You need to create a trip first before adding expenses.");
            return;
        }
        setShowExpenseDialog(true);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Welcome Header */}
            <div className="mb-10 pl-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <MapPin className="w-6 h-6 text-blue-400"/>
                        <h1 className="text-4xl font-bold text-gray-100">
                            Welcome back, <span className="text-blue-400">{user!.firstName || user!.username}</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {user.roles?.includes(UserRole.Admin) && (
                            <Link
                                href="/admin/security"
                                className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-colors"
                                title="Logging & Monitoring"
                            >
                                <Shield className="w-4 h-4"/>
                                <span>Security</span>
                            </Link>
                        )}
                        <Link
                            href="/settings"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                            title="Settings"
                        >
                            <Settings className="w-4 h-4"/>
                            <span>Settings</span>
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4"/>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
                <p className="text-lg font-medium text-gray-300 pl-9">
                    Here&apos;s what&apos;s happening with your trips
                </p>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Trips */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-700 flex items-center justify-between gap-4">
                            <h3 className="text-lg font-semibold text-gray-100">Your Trips</h3>
                            <div className="relative w-full max-w-xs">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400"/>
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100 placeholder-gray-400 text-sm"
                                    placeholder="Search trips..."
                                    value={tripSearchQuery}
                                    onChange={(e) => setTripSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {trips.length === 0 ? (
                            <div className="p-6 text-center">
                                <h3 className="text-xl font-bold text-gray-100 mb-2">No trips yet</h3>
                                <p className="text-gray-400 mb-4">Create your first trip to get started!</p>
                                <button
                                    onClick={() => setIsDialogOpen(true)}
                                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors mx-auto"
                                >
                                    <Plus className="w-4 h-4 mr-2"/>
                                    Create New Trip
                                </button>
                                {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}
                            </div>
                        ) : filteredTrips.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">No trips match your search.</div>
                        ) : (
                            <div className="p-6 space-y-6">
                                {/* Featured trip */}
                                {featuredTrip && (
                                    <Link
                                        href={`/trips/${featuredTrip.id}/balances`}
                                        className="block bg-blue-900/20 rounded-lg border border-blue-700/40 hover:border-blue-500 transition-colors overflow-hidden"
                                    >
                                        <div className="p-5 border-b border-blue-700/30">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h4 className="text-lg font-bold text-gray-100">
                                                        {featuredTrip.name || featuredTrip.destination}
                                                    </h4>
                                                    {featuredTrip.name && (
                                                        <div className="flex items-center text-gray-400 mt-1">
                                                            <MapPin className="w-4 h-4 mr-1"/>
                                                            <span className="text-sm">{featuredTrip.destination}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {(() => {
                                                    const b = tripBadge(featuredTrip);
                                                    return (
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${b.classes}`}>
                                                            {b.label}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <div className="flex items-center text-gray-400 text-sm mb-3">
                                                <Calendar className="w-4 h-4 mr-1"/>
                                                {formatDate(featuredTrip.startTime)}
                                                {featuredTrip.endTime && ` – ${formatDate(featuredTrip.endTime)}`}
                                            </div>
                                            {featuredTrip.description && (
                                                <p className="text-gray-300 text-sm mb-3">{featuredTrip.description}</p>
                                            )}
                                            <div className="flex items-center gap-6 text-sm text-gray-300">
                                                <span className="flex items-center">
                                                    <Users className="w-4 h-4 mr-1 text-gray-400"/>
                                                    {featuredTrip.participants?.length ?? 0} participants
                                                </span>
                                                <span className="flex items-center">
                                                    <DollarSign className="w-4 h-4 mr-1 text-gray-400"/>
                                                    {tripExpenseTotals(featuredTrip).length === 0
                                                        ? 'No expenses yet'
                                                        : tripExpenseTotals(featuredTrip)
                                                            .map(([cur, sum]) => `${sum.toFixed(2)} ${cur}`)
                                                            .join(' + ')}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                )}

                                {/* Upcoming list (excluding featured) */}
                                {activeTrips.length > 1 && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                            Upcoming & Ongoing
                                        </h4>
                                        <div className="divide-y divide-gray-700 border border-gray-700 rounded-lg overflow-hidden">
                                            {activeTrips.slice(1).map(trip => (
                                                <TripRow key={trip.id} trip={trip} badge={tripBadge(trip)} totals={tripExpenseTotals(trip)}/>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Past list */}
                                {pastTrips.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                            Past
                                        </h4>
                                        <div className="divide-y divide-gray-700 border border-gray-700 rounded-lg overflow-hidden">
                                            {pastTrips.map(trip => (
                                                <TripRow key={trip.id} trip={trip} badge={tripBadge(trip)} totals={tripExpenseTotals(trip)}/>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* No active trips but query matched none of them */}
                                {!featuredTrip && pastTrips.length === 0 && (
                                    <div className="text-gray-400 text-sm">No trips to show.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Expenses */}
                <div>
                    <div
                        className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 hover:border-blue-500 transition-colors">
                        <div className="p-6 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-100">Recent Expenses</h3>
                                <Link
                                    href="/expenses"
                                    className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                                >
                                    View All
                                </Link>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="space-y-4">
                                {myExpenses?.map((expense) => (
                                    <div key={expense.id} className="flex items-center justify-between group">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-100 group-hover:text-blue-300 transition-colors">
                                                {expense.description}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                Paid
                                                by {expense.paidBy?.username} • {formatDate(expense.dateOfExpense)}
                                            </p>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-100">
                                        ${expense.amount}
                                    </span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleOpenExpenseDialog}
                                className="w-full mt-4 flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                            >
                                <DollarSign className="w-4 h-4 mr-2"/>
                                Add Expense
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div
                    className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 hover:border-blue-500 transition-colors">
                    <div className="flex items-center">
                        <div className="p-3 bg-blue-900/30 rounded-lg">
                            <MapPin className="w-6 h-6 text-blue-400"/>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-300">Active Trips</p>
                            <p className="text-2xl font-bold text-gray-100">{trips.length || 0}</p>
                        </div>
                    </div>
                </div>

                <div
                    className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 hover:border-green-500 transition-colors">
                    <div className="flex items-center">
                        <div className="p-3 bg-green-900/30 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-400"/>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-300">Total Spent</p>
                            <p className="text-2xl font-bold text-gray-100">${totalExpensesPaidByMe || 0}</p>
                        </div>
                    </div>
                </div>

                <div
                    className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 hover:border-purple-500 transition-colors">
                    <div className="flex items-center">
                        <div className="p-3 bg-purple-900/30 rounded-lg">
                            <Users className="w-6 h-6 text-purple-400"/>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-300">Travel Buddies</p>
                            <p className="text-2xl font-bold text-gray-100">{allUsers.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => setIsDialogOpen(true)}
                        className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-2"/>
                        New Trip
                    </button>
                    <button
                        onClick={handleOpenExpenseDialog}
                        className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                    >
                        <DollarSign className="w-4 h-4 mr-2"/>
                        Add Expense
                    </button>
                </div>
            </div>

            {/* Create Trip Dialog */}
            {isDialogOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 w-full max-w-md">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-100">Create New Trip</h3>
                                <button
                                    onClick={() => setIsDialogOpen(false)}
                                    className="text-gray-400 hover:text-gray-300"
                                >
                                    <X className="w-5 h-5"/>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Trip Name (optional)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                        value={tripForm.name}
                                        onChange={(e) => setTripForm({...tripForm, name: e.target.value})}
                                        placeholder="E.g., Summer Vacation 2025"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Destination *
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                        value={tripForm.destination}
                                        onChange={(e) => setTripForm({...tripForm, destination: e.target.value})}
                                        required
                                        placeholder="E.g., Paris, France"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                        value={tripForm.description}
                                        onChange={(e) => setTripForm({...tripForm, description: e.target.value})}
                                        rows={3}
                                        placeholder="A brief description of your trip"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Start Date/Time *
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                            value={tripForm.startTime}
                                            onChange={(e) => setTripForm({...tripForm, startTime: e.target.value})}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            End Date/Time (optional)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                            value={tripForm.endTime}
                                            onChange={(e) => setTripForm({...tripForm, endTime: e.target.value})}
                                        />
                                    </div>
                                </div>

                                {/* Participants Section */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Participants
                                    </label>

                                    {/* Selected Participants */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {selectedParticipants.map(participant => (
                                            <div
                                                key={participant.id}
                                                className="flex items-center bg-gray-700 rounded-full px-3 py-1 text-sm text-gray-100"
                                            >
                                            <span>
                                                {participant.firstName || participant.username}
                                                {participant.id === user.id && " (You)"}
                                            </span>
                                                {participant.id !== user.id && (
                                                    <button
                                                        onClick={() => toggleParticipant(participant)}
                                                        className="ml-1 text-gray-400 hover:text-gray-300"
                                                    >
                                                        <X className="w-3 h-3"/>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Search Input */}
                                    <div className="relative">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-4 w-4 text-gray-400"/>
                                        </div>
                                        <input
                                            type="text"
                                            className="block w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100 placeholder-gray-400"
                                            placeholder="Search users..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    {/* Search Results */}
                                    {searchQuery && (
                                        <div className="mt-2 border border-gray-700 rounded-lg overflow-hidden">
                                            {searchResults.length > 0 ? (
                                                searchResults.map(user => (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => toggleParticipant(user)}
                                                        className={`flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700 ${
                                                            user.selected ? 'bg-blue-900/30' : 'bg-gray-800'
                                                        }`}
                                                    >
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-100">
                                                                {user.firstName} {user.lastName}
                                                            </p>
                                                            <p className="text-sm text-gray-400">@{user.username}</p>
                                                        </div>
                                                        {user.selected ? (
                                                            <Check className="h-5 w-5 text-blue-400"/>
                                                        ) : (
                                                            <UserPlus className="h-5 w-5 text-gray-400"/>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div
                                                    className="px-4 py-3 text-center text-sm text-gray-400 bg-gray-800">
                                                    No users found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    onClick={() => setIsDialogOpen(false)}
                                    className="px-4 py-2 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateTrip}
                                    disabled={isCreating || !tripForm.destination || !tripForm.startTime}
                                    className={`px-4 py-2 rounded-lg text-white ${
                                        isCreating ? 'bg-blue-700' : 'bg-blue-600 hover:bg-blue-500'
                                    } transition-colors disabled:bg-gray-600 disabled:text-gray-400`}
                                >
                                    {isCreating ? 'Creating...' : 'Create Trip'}
                                </button>
                            </div>

                            {error && (
                                <div className="mt-4 text-red-400 text-sm">{error}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Create Expense Dialog */}
            <ExpenseDialog
                isOpen={showExpenseDialog}
                onCloseAction={() => setShowExpenseDialog(false)}
                user={user}
                trips={trips}
                onExpenseCreatedAction={refreshExpenses}
            />
        </div>
    )
}