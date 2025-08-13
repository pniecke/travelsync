'use client'

import {Calendar, Check, DollarSign, MapPin, Plus, Search, UserPlus, Users, X} from "lucide-react";
import React, {useEffect, useState} from "react";
import {Expense, Trip, TripStatus, User} from "@/types";
import {createTrip, getMyTrips} from "@/services/tripService";
import {GetServerSideProps} from "next";
import apiClient from "@/services/apiClient";
import {getAllUsers, getLoggedInUser} from "@/services/userService";
import Link from "next/link";
import {getExpenses} from "@/services/expenseService";
import ExpenseDialog from "@/components/ExpenseDialog";
import {formatDate} from "@/utils/date";

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
    apiClient.defaults.headers.Cookie = cookieHeader

    try {
        const [user, trips, expenses, allUsers] = await Promise.all([
            getLoggedInUser(),
            getMyTrips(),
            getExpenses(),
            getAllUsers()
        ]);
        const filteredUsers = allUsers.filter(u => u.id !== user.id);
        const myExpenses = expenses.filter(expense => expense.createdBy.id === user.id);
        const expensesPaidByMe = expenses.filter(expense => expense.paidBy?.id === user.id);
        return {props: {user, trips, myExpenses, expensesPaidByMe, allUsers: filteredUsers}}
    } catch (error) {
        console.error("Error fetching data:", error);
        // If any call fails (e.g. 401), redirect to login
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

    const getUpcomingTrip = (trips: Trip[]): Trip | undefined => {
        if (!trips || trips.length === 0) return undefined;
        const now = Date.now();
        return trips
            .filter(trip => {
                const start = new Date(trip.startTime).getTime();
                const end = trip.endTime ? new Date(trip.endTime).getTime() : Infinity;
                return start <= now && now <= end    // ongoing
                    || start >= now;                 // upcoming
            })
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            [0];
    }
    const upcomingTrip = getUpcomingTrip(trips);
    const totalExpensesUpcomingTrip = upcomingTrip?.expenses?.reduce((acc, expense) => acc + expense.amount, 0);
    const totalExpensesPaidByMe = expensesPaidByMe?.reduce((acc, expense) => acc + expense.amount, 0) || 0;

    const handleCreateTrip = async () => {
        setIsCreating(true);
        setError(null);

        try {
            const newTrips: Trip[] = [{
                participants: selectedParticipants,
                name: tripForm.name,
                destination: tripForm.destination,
                startTime: tripForm.startTime,
                endTime: tripForm.endTime,
                description: tripForm.description,
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

    // Search users based on query
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
                <div className="flex items-center gap-3 mb-3">
                    <MapPin className="w-6 h-6 text-blue-400"/>
                    <h1 className="text-4xl font-bold text-gray-100">
                        Welcome back, <span className="text-blue-400">{user!.firstName}</span>!
                    </h1>
                </div>
                <p className="text-lg font-medium text-gray-300 pl-9">
                    Here&apos;s what&apos;s happening with your trips
                </p>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Upcoming Trip Highlight */}
                <div className="lg:col-span-2">
                    <div
                        className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden hover:border-blue-500 transition-colors">
                        {upcomingTrip ? (
                            <>
                                <div className="bg-blue-900/20 p-6 border-b border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-100 mb-1">
                                                {upcomingTrip.name || upcomingTrip.destination}
                                            </h3>
                                            {upcomingTrip.name && (
                                                <div className="flex items-center text-gray-400">
                                                    <MapPin className="w-4 h-4 mr-1"/>
                                                    <span className="text-sm">{upcomingTrip.destination}</span>
                                                </div>
                                            )}
                                        </div>
                                        <span
                                            className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                            {new Date(upcomingTrip.startTime) > new Date() ? "Upcoming" : "Ongoing"}
                        </span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="flex items-center text-gray-400 mb-4">
                                        <Calendar className="w-4 h-4 mr-1"/>
                                        <span className="text-sm">
                            {formatDate(upcomingTrip.startTime)}
                                            {upcomingTrip.endTime && ` - ${formatDate(upcomingTrip.endTime)}`}
                        </span>
                                    </div>

                                    {upcomingTrip.description && (
                                        <p className="text-gray-300 mb-4">{upcomingTrip.description}</p>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center">
                                            <Users className="w-5 h-5 text-gray-400 mr-2"/>
                                            <span className="text-sm text-gray-300">
                                {upcomingTrip.participants?.length || 0} participants
                            </span>
                                        </div>
                                        <div className="flex items-center">
                                            <DollarSign className="w-5 h-5 text-gray-400 mr-2"/>
                                            <span className="text-sm text-gray-300">
                                ${totalExpensesUpcomingTrip || 0} total
                            </span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="p-6 text-center">
                                <h3 className="text-xl font-bold text-gray-100 mb-2">No upcoming trips</h3>
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
                                                by {expense.paidBy?.username} • {formatDate(expense.date)}
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