'use client'

import {Plus, Search, X} from "lucide-react";
import {useEffect, useState} from "react";
import {Currency, Expense, Trip, User} from "@/types";
import {createExpense} from "@/services/expenseService";

interface ExpenseDialogProps {
    isOpen: boolean;
    onCloseAction: () => void;
    user: User;
    trips: Trip[];
    onExpenseCreatedAction: () => Promise<void>;
    availableCurrencies?: Currency[];
    defaultCurrency?: Currency;
}

export default function ExpenseDialog({
                                          isOpen,
                                          onCloseAction: onClose,
                                          user,
                                          trips,
                                          onExpenseCreatedAction: onExpenseCreated,
                                          availableCurrencies = [Currency.Chf, Currency.Eur, Currency.Usd],
                                          defaultCurrency = Currency.Chf
                                      }: ExpenseDialogProps) {
    const [expenseForm, setExpenseForm] = useState<Omit<Expense, 'id'>>({
        description: '',
        amount: 0,
        tripId: '',
        createdBy: user,
        currency: defaultCurrency,
        paidBy: user,
        date: new Date().toISOString().slice(0, 16)
    });
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [tripSearchQuery, setTripSearchQuery] = useState('');
    const [tripSearchResults, setTripSearchResults] = useState<Trip[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!tripSearchQuery.trim()) {
            setTripSearchResults(trips);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(() => {
            const results = trips.filter(trip => {
                const nameMatch = trip.name?.toLowerCase().includes(tripSearchQuery.toLowerCase());
                const destinationMatch = trip.destination.toLowerCase().includes(tripSearchQuery.toLowerCase());
                const descriptionMatch = trip.description?.toLowerCase().includes(tripSearchQuery.toLowerCase());
                return nameMatch || destinationMatch || descriptionMatch;
            });
            setTripSearchResults(results);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [tripSearchQuery, trips]);

    useEffect(() => {
        if (isOpen) {
            setTripSearchQuery('');
            setTripSearchResults(trips);
            setSelectedTrip(null);
            setIsSearching(false);
        }
    }, [isOpen, trips]);

    const selectTrip = (trip: Trip) => {
        if (!trip.participants || trip.participants.length === 0) {
            setError("No participants available for this trip.");
        }
        setSelectedTrip(trip);
        setTripSearchQuery('');
        if (trip.participants && trip.participants.length > 0) {
            setExpenseForm(prev => ({
                ...prev,
                paidBy: trip.participants[0]
            }));
        }
    };

    const validateForm = () => {
        if (!expenseForm.description) {
            setError("Please enter a description");
            return false;
        }

        if (!expenseForm.amount || expenseForm.amount <= 0) {
            setError("Please enter a positive amount");
            return false;
        }

        if (!selectedTrip) {
            setError("Please select a trip");
            return false;
        }

        setError(null);
        return true;
    };

    const handleCreateExpense = async () => {
        if (!validateForm()) return;
        if (!selectedTrip?.id) {
            setError("Selected trip is missing an Id")
            return;
        }
        setIsSubmitting(true);
        try {
            const newExpense: Omit<Expense, 'id'> = {
                description: expenseForm.description,
                amount: Number(expenseForm.amount),
                tripId: selectedTrip.id,
                createdBy: user,
                currency: "CHF",
                paidBy: expenseForm.paidBy || user,
                date: expenseForm.date || new Date().toISOString().slice(0, 16),
            };

            await createExpense([newExpense]);
            await onExpenseCreated();

            // Reset form
            setExpenseForm({
                description: '',
                amount: 0,
                tripId: '',
                createdBy: user,
                currency: defaultCurrency,
                paidBy: user,
                date: new Date().toISOString().slice(0, 16)
            });
            setSelectedTrip(null);
            setTripSearchQuery('');
            onClose();
        } catch (err) {
            setError("Failed to create expense. Please try again.");
            console.error("Error creating expense:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 w-full max-w-md">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-100">Create New Expense</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-300"
                        >
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
                                value={expenseForm.description}
                                onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Amount *
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        className="w-full pl-3 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                        value={expenseForm.amount || ''}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value);
                                            setExpenseForm({
                                                ...expenseForm,
                                                amount: isNaN(value) ? 0 : value
                                            });
                                        }}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Currency
                                </label>
                                <select
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                    value={expenseForm.currency}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (Object.values(Currency).includes(value as Currency)) {
                                            setExpenseForm({
                                                ...expenseForm,
                                                currency: value as Currency
                                            });
                                        }
                                    }}
                                >
                                    {availableCurrencies.map(currency => (
                                        <option key={currency} value={currency} className="bg-gray-800">
                                            {currency}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Trip Selection Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Trip *
                            </label>

                            {/* Selected Trip */}
                            {selectedTrip && (
                                <div
                                    className="flex items-center justify-between bg-gray-700 rounded-lg px-4 py-2 mb-3">
                                    <div>
                                        <p className="font-medium text-gray-100">
                                            {selectedTrip.name || selectedTrip.destination}
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            {new Date(selectedTrip.startTime).toLocaleDateString()}
                                            {selectedTrip.endTime && ` - ${new Date(selectedTrip.endTime).toLocaleDateString()}`}
                                            {selectedTrip.name && ` • ${selectedTrip.destination}`}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedTrip(null)}
                                        className="text-gray-400 hover:text-gray-300"
                                    >
                                        <X className="w-4 h-4"/>
                                    </button>
                                </div>
                            )}

                            {/* Search Input */}
                            {!selectedTrip && (
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-gray-400"/>
                                    </div>
                                    <input
                                        type="text"
                                        className="block w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100 placeholder-gray-400"
                                        placeholder="Search by destination, name, or description..."
                                        value={tripSearchQuery}
                                        onChange={(e) => setTripSearchQuery(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Search Results */}
                            {!selectedTrip && (
                                <div className="mt-2 border border-gray-700 rounded-lg overflow-hidden">
                                    {tripSearchQuery ? (
                                        isSearching ? (
                                            <div className="px-4 py-3 text-center text-sm text-gray-400 bg-gray-800">
                                                Searching...
                                            </div>
                                        ) : tripSearchResults.length > 0 ? (
                                            tripSearchResults.map(trip => (
                                                <div
                                                    key={trip.id}
                                                    onClick={() => selectTrip(trip)}
                                                    className={`flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700 bg-gray-800`}
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-100">
                                                            {trip.name || trip.destination}
                                                        </p>
                                                        <p className="text-sm text-gray-400">
                                                            {new Date(trip.startTime).toLocaleDateString()}
                                                            {trip.endTime && ` - ${new Date(trip.endTime).toLocaleDateString()}`}
                                                            {trip.name && ` • ${trip.destination}`}
                                                        </p>
                                                    </div>
                                                    <Plus className="h-5 w-5 text-gray-400"/>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-center text-sm text-gray-400 bg-gray-800">
                                                No trips found
                                            </div>
                                        )
                                    ) : (
                                        trips.length > 0 ? (
                                            trips.map(trip => (
                                                <div
                                                    key={trip.id}
                                                    onClick={() => selectTrip(trip)}
                                                    className={`flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700 bg-gray-800`}
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-100">
                                                            {trip.name || trip.destination}
                                                        </p>
                                                        <p className="text-sm text-gray-400">
                                                            {new Date(trip.startTime).toLocaleDateString()}
                                                            {trip.endTime && ` - ${new Date(trip.endTime).toLocaleDateString()}`}
                                                            {trip.name && ` • ${trip.destination}`}
                                                        </p>
                                                    </div>
                                                    <Plus className="h-5 w-5 text-gray-400"/>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-center text-sm text-gray-400 bg-gray-800">
                                                No trips available
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Paid By Selection */}
                        {selectedTrip && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Paid By
                                </label>
                                <select
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                                    value={expenseForm.paidBy?.id || user.id}
                                    onChange={(e) => {
                                        const payer = selectedTrip?.participants?.find(p => p.id === e.target.value);
                                        if (payer) {
                                            setExpenseForm({
                                                ...expenseForm,
                                                paidBy: payer
                                            });
                                        }
                                    }}
                                >
                                    {selectedTrip.participants?.map(participant => (
                                        <option
                                            key={participant.id}
                                            value={participant.id}
                                            className="bg-gray-800"
                                        >
                                            {participant.firstName || participant.username}
                                            {participant.id === user.id && " (You)"}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 text-red-400 text-sm">{error}</div>
                    )}

                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateExpense}
                            disabled={isSubmitting}
                            className={`px-4 py-2 rounded-lg text-white ${
                                isSubmitting
                                    ? 'bg-gray-600 text-gray-400'
                                    : 'bg-blue-600 hover:bg-blue-500'
                            } transition-colors`}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Expense'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}