import {Expense, Trip, User} from "@/types";
import React, {useEffect, useState} from "react";
import {getLoggedInUser} from "@/services/userService";
import {getMyTrips} from "@/services/tripService";
import {Calendar, DollarSign, Filter, Plus, Search, X} from "lucide-react";
import {getExpenses} from "@/services/expenseService";
import Link from "next/link";
import ExpenseDialog from "@/components/ExpenseDialog";
import {formatDate} from "@/utils/date";
import {GetServerSideProps} from "next";
import {createServerApiClient} from "@/services/apiClient";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
    const cookieHeader = ctx.req.headers.cookie
    if (!cookieHeader) {
        return {redirect: {destination: '/login', permanent: false}}
    }
    const ssrClient = createServerApiClient(cookieHeader)

    try {
        const [user, trips, expenses] = await Promise.all([
            getLoggedInUser(ssrClient),
            getMyTrips(ssrClient),
            getExpenses(undefined, ssrClient),
        ]);

        return {props: {initialUser: user, initialTrips: trips, initialExpenses: expenses}}
    } catch (error) {
        console.error("Error fetching data:", error);
        return {
            redirect: {destination: '/login', permanent: false}
        }
    }
}

interface ExpensesPageProps {
    initialUser: User
    initialTrips: Trip[]
    initialExpenses: Expense[]
}

export default function Expenses({initialUser, initialTrips, initialExpenses}: ExpensesPageProps) {
    const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
    const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
    const trips = initialTrips;
    const user = initialUser;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTripFilter, setSelectedTripFilter] = useState<string>('all');
    const [timeFilter, setTimeFilter] = useState<string>('all')
    const [payerFilter, setPayerFilter] = useState<string>('all');
    const [filtersVisible, setFiltersVisible] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const [showExpenseDialog, setShowExpenseDialog] = useState(false);

    useEffect(() => {
        const applyFilters = () => {
            let result = [...expenses];

            // Search filter
            if (searchQuery) {
                result = result.filter(expense =>
                    expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    expense.paidBy?.username.toLowerCase().includes(searchQuery.toLowerCase()));
            }

            // Trip filter
            if (selectedTripFilter !== 'all') {
                result = result.filter(expense => expense.tripId === selectedTripFilter);
            }

            // Time filter
            const now = new Date();
            if (timeFilter === 'month') {
                const lastMonth = new Date();
                lastMonth.setMonth(now.getMonth() - 1);
                result = result.filter(expense => new Date(expense.dateOfExpense) >= lastMonth);
            } else if (timeFilter === 'year') {
                const lastYear = new Date();
                lastYear.setFullYear(now.getFullYear() - 1);
                result = result.filter(expense => new Date(expense.dateOfExpense) >= lastYear);
            }

            // Payer filter
            if (payerFilter === 'me') {
                result = result.filter(expense => expense.paidBy?.id === user?.id);
            } else if (payerFilter === 'others' && user) {
                result = result.filter(expense => expense.paidBy?.id !== user.id);
            }
            setFilteredExpenses(result);
        }
        applyFilters();
    }, [searchQuery, selectedTripFilter, timeFilter, payerFilter, expenses, trips, user]);

    const getTotalAmount = () => {
        return filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);
    }

    const refreshExpenses = async () => {
        const updatedExpenses = await getExpenses();
        setExpenses(updatedExpenses);
        setFilteredExpenses(updatedExpenses);
    };

    const resetFilters = () => {
        setSearchQuery('');
        setSelectedTripFilter('all');
        setTimeFilter('all');
        setPayerFilter('all');
    }

    const getTripName = (tripId: string) => {
        const trip = trips.find(t => t.id === tripId);
        return trip ? (trip.name || trip.destination) : 'Unknown Trip';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {error && (
                <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="float-right text-red-200 hover:text-white"
                    >
                        <X className="w-4 h-4"/>
                    </button>
                </div>
            )}
            <div className="mb-8 flex items-start justify-between gap-4">
                <div className="pl-4 border-l-4 border-blue-500">
                    <h1 className="text-3xl font-bold text-gray-100 mb-2">All Expenses</h1>
                    <p className="text-gray-300 font-medium">
                        {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found
                    </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                    {selectedTripFilter !== 'all' && (
                        <Link
                            href={`/trips/${selectedTripFilter}?tab=balances`}
                            className="flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors shadow-md"
                        >
                            View Balances
                        </Link>
                    )}
                    <button
                        onClick={() => {
                            if (trips.length === 0) {
                                setError("You need to create a trip first before adding expenses.");
                                return;
                            }
                            setShowExpenseDialog(true);
                        }}
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-md"
                    >
                        <Plus className="w-4 h-4 mr-2"/>
                        Create Expense
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400"/>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100 placeholder-gray-400"
                            placeholder="Search expenses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filter Button */}
                    <button
                        onClick={() => setFiltersVisible(!filtersVisible)}
                        className="flex items-center justify-center px-4 py-2 border border-gray-600 rounded-lg text-gray-200 hover:bg-gray-700 transition-colors"
                    >
                        <Filter className="w-4 h-4 mr-2"/>
                        Filters
                    </button>
                </div>

                {/* Expanded Filters */}
                {filtersVisible && (
                    <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Trip Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Trip</label>
                            <select
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                value={selectedTripFilter}
                                onChange={(e) => setSelectedTripFilter(e.target.value)}
                            >
                                <option value="all" className="bg-gray-800">All Trips</option>
                                {trips.map(trip => (
                                    <option key={trip.id} value={trip.id} className="bg-gray-800">
                                        {trip.name || trip.destination}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Time Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Time Period</label>
                            <select
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                value={timeFilter}
                                onChange={(e) => setTimeFilter(e.target.value)}
                            >
                                <option value="all" className="bg-gray-800">All Time</option>
                                <option value="month" className="bg-gray-800">Last Month</option>
                                <option value="year" className="bg-gray-800">Last Year</option>
                            </select>
                        </div>

                        {/* Payer Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Payer</label>
                            <select
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                value={payerFilter}
                                onChange={(e) => setPayerFilter(e.target.value)}
                            >
                                <option value="all" className="bg-gray-800">Everyone</option>
                                <option value="me" className="bg-gray-800">Paid by Me</option>
                                <option value="others" className="bg-gray-800">Paid by Others</option>
                            </select>
                        </div>

                        {/* Reset Button */}
                        <div className="md:col-span-3 flex justify-end">
                            <button
                                onClick={resetFilters}
                                className="flex items-center text-blue-400 hover:text-blue-300 text-sm transition-colors"
                            >
                                <X className="w-4 h-4 mr-1"/>
                                Reset Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div
                    className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-6 hover:border-blue-500 transition-colors">
                    <div className="flex items-center">
                        <div className="p-3 bg-blue-900/30 rounded-lg">
                            <DollarSign className="w-6 h-6 text-blue-400"/>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-300">Total Expenses</p>
                            <p className="text-2xl font-bold text-gray-100">${getTotalAmount().toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div
                    className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-6 hover:border-green-500 transition-colors">
                    <div className="flex items-center">
                        <div className="p-3 bg-green-900/30 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-400"/>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-300">Paid by Me</p>
                            <p className="text-2xl font-bold text-gray-100">
                                ${filteredExpenses
                                .filter(e => user && e.paidBy?.id === user.id)
                                .reduce((sum, e) => sum + e.amount, 0)
                                .toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
                <div
                    className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-6 hover:border-purple-500 transition-colors">
                    <div className="flex items-center">
                        <div className="p-3 bg-purple-900/30 rounded-lg">
                            <DollarSign className="w-6 h-6 text-purple-400"/>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-300">Paid by Others</p>
                            <p className="text-2xl font-bold text-gray-100">
                                ${filteredExpenses
                                .filter(e => user && e.paidBy?.id !== user.id)
                                .reduce((sum, e) => sum + e.amount, 0)
                                .toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expenses List */}
            <div className="bg-gray-800 rounded-xl shadow-md border border-gray-700 overflow-hidden">
                <div className="p-6">
                    {filteredExpenses.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-400">No expenses found matching your filters</p>
                            <button
                                onClick={resetFilters}
                                className="mt-4 text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                Clear all filters
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-700">
                            {filteredExpenses.map((expense) => (
                                <div key={expense.id}
                                     className="py-4 first:pt-0 last:pb-0 hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <p className="font-medium text-gray-100">
                                                    {expense.description}
                                                </p>
                                                {expense.tripId && (
                                                    <span
                                                        className="ml-2 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                                                        {getTripName(expense.tripId)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center text-gray-400 text-sm mt-1">
                                                <Calendar className="w-3 h-3 mr-1"/>
                                                <span className="mr-3">{formatDate(expense.dateOfExpense)}</span>
                                                <span>
                                                Paid by {expense.paidBy?.username}
                                                    {user && expense.paidBy?.id === user.id && " (You)"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="ml-4 text-right">
                                            <p className={`font-semibold ${
                                                user && expense.paidBy?.id === user.id
                                                    ? 'text-green-400'
                                                    : 'text-gray-100'
                                            }`}>
                                                ${expense.amount.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {/* Create Expense Dialog */}
            <ExpenseDialog
                isOpen={showExpenseDialog}
                onCloseAction={() => setShowExpenseDialog(false)}
                user={user}
                trips={trips}
                onExpenseCreatedAction={refreshExpenses}
            />
        </div>
    );
}