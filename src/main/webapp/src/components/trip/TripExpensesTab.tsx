'use client'

import {Calendar, Paperclip, Plus} from "lucide-react";
import {useState} from "react";
import Link from "next/link";
import {Expense, Trip, User} from "@/types";
import ExpenseDialog from "@/components/ExpenseDialog";
import {getExpenses} from "@/services/expenseService";
import {formatDate} from "@/utils/date";

interface TripExpensesTabProps {
    user: User;
    trip: Trip;
    initialExpenses: Expense[];
}

export default function TripExpensesTab({user, trip, initialExpenses}: TripExpensesTabProps) {
    const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
    const [dialogOpen, setDialogOpen] = useState(false);

    const refresh = async () => {
        if (!trip.id) return;
        const updated = await getExpenses({tripId: trip.id});
        setExpenses(updated);
    };

    const sorted = expenses
        .slice()
        .sort((a, b) => new Date(b.dateOfExpense).getTime() - new Date(a.dateOfExpense).getTime());

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end">
                <button
                    onClick={() => setDialogOpen(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-md"
                >
                    <Plus className="w-4 h-4 mr-2"/>
                    Add Expense
                </button>
            </div>

            <div className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-6">
                {sorted.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">
                        No expenses recorded for this trip yet.
                    </p>
                ) : (
                    <div className="divide-y divide-gray-700">
                        {sorted.map(expense => (
                            <Link
                                key={expense.id}
                                href={`/expenses/${expense.id}`}
                                className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-3 -mx-2 px-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                            >
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-100 truncate flex items-center gap-2">
                                        {expense.description}
                                        {expense.receiptFilename && (
                                            <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
                                        )}
                                    </p>
                                    <div className="flex items-center text-gray-400 text-sm mt-1">
                                        <Calendar className="w-3 h-3 mr-1 shrink-0"/>
                                        <span className="mr-3">{formatDate(expense.dateOfExpense)}</span>
                                        <span>
                                            Paid by {expense.paidBy?.username}
                                            {expense.paidBy?.id === user.id && " (You)"}
                                        </span>
                                    </div>
                                </div>
                                <span className={`tabular-nums font-semibold shrink-0 ${
                                    expense.paidBy?.id === user.id ? 'text-green-400' : 'text-gray-100'
                                }`}>
                                    {expense.amount.toFixed(2)} {expense.currency}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <ExpenseDialog
                isOpen={dialogOpen}
                onCloseAction={() => setDialogOpen(false)}
                user={user}
                trips={[trip]}
                onExpenseCreatedAction={refresh}
            />
        </div>
    );
}
