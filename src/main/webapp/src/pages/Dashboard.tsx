'use client'

import {Calendar, DollarSign, MapPin, Plus, Users} from "lucide-react";
import React from "react";

const mockUpcomingTrip = {
    id: "1",
    name: "Tokyo Adventure",
    startDate: "2024-03-15",
    endDate: "2024-03-22",
    location: "Tokyo, Japan",
    participants: 4,
    totalExpenses: 2450,
    image: "/placeholder.svg?height=200&width=300",
}

const mockRecentExpenses = [
    {id: "1", description: "Hotel booking", amount: 450, paidBy: "John", date: "2024-01-15"},
    {id: "2", description: "Flight tickets", amount: 1200, paidBy: "Sarah", date: "2024-01-14"},
    {id: "3", description: "Restaurant dinner", amount: 85, paidBy: "Mike", date: "2024-01-13"},
    {id: "4", description: "Museum tickets", amount: 40, paidBy: "John", date: "2024-01-12"},
]

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

export const Dashboard: React.FC = () => {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, John!</h1>
                <p className="text-slate-600">Here's what's happening with your trips</p>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Upcoming Trip Highlight */}
                <div className="lg:col-span-2">
                    <div
                        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative">
                            <img
                                src={mockUpcomingTrip.image || "/placeholder.svg"}
                                alt={mockUpcomingTrip.name}
                                className="w-full h-48 object-cover"
                            />
                            <div className="absolute top-4 left-4">
                                <span
                                    className="bg-sky-500 text-white px-3 py-1 rounded-full text-sm font-medium">Upcoming</span>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{mockUpcomingTrip.name}</h3>
                                    <div className="flex items-center text-slate-600 mb-2">
                                        <MapPin className="w-4 h-4 mr-1"/>
                                        <span className="text-sm">{mockUpcomingTrip.location}</span>
                                    </div>
                                    <div className="flex items-center text-slate-600">
                                        <Calendar className="w-4 h-4 mr-1"/>
                                        <span className="text-sm">
                                            {formatDate(mockUpcomingTrip.startDate)} -{" "}
                                            {formatDate(mockUpcomingTrip.endDate)}
                                        </span>
                                    </div>
                                </div>
                                {/*<Link*/}
                                {/*    to={`/trip/${mockUpcomingTrip.id}`}*/}
                                {/*    className="flex items-center text-sky-600 hover:text-sky-700 font-medium text-sm"*/}
                                {/*>*/}
                                {/*    View Details*/}
                                {/*    <ArrowRight className="w-4 h-4 ml-1"/>*/}
                                {/*</Link>*/}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center">
                                    <Users className="w-5 h-5 text-slate-400 mr-2"/>
                                    <span
                                        className="text-sm text-slate-600">{mockUpcomingTrip.participants} participants</span>
                                </div>
                                <div className="flex items-center">
                                    <DollarSign className="w-5 h-5 text-slate-400 mr-2"/>
                                    <span
                                        className="text-sm text-slate-600">${mockUpcomingTrip.totalExpenses} total</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Expenses */}
                <div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">Recent Expenses</h3>
                                <button className="text-sky-600 hover:text-sky-700 text-sm font-medium">View All
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="space-y-4">
                                {mockRecentExpenses.map((expense) => (
                                    <div key={expense.id} className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-900">{expense.description}</p>
                                            <p className="text-xs text-slate-500">
                                                Paid by {expense.paidBy} • {formatDate(expense.date)}
                                            </p>
                                        </div>
                                        <span className="text-sm font-semibold text-slate-900">${expense.amount}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                className="w-full mt-4 flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                <Plus className="w-4 h-4 mr-2"/>
                                Add Expense
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center">
                        <div className="p-3 bg-sky-100 rounded-lg">
                            <MapPin className="w-6 h-6 text-sky-600"/>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-slate-600">Active Trips</p>
                            <p className="text-2xl font-bold text-slate-900">3</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-600"/>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-slate-600">Total Spent</p>
                            <p className="text-2xl font-bold text-slate-900">$4,250</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Users className="w-6 h-6 text-purple-600"/>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-slate-600">Travel Buddies</p>
                            <p className="text-2xl font-bold text-slate-900">12</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        className="flex items-center justify-center px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors">
                        <Plus className="w-4 h-4 mr-2"/>
                        New Trip
                    </button>
                    <button
                        className="flex items-center justify-center px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        <DollarSign className="w-4 h-4 mr-2"/>
                        Add Expense
                    </button>
                    {/*<Link*/}
                    {/*    to="/recommendations"*/}
                    {/*    className="flex items-center justify-center px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"*/}
                    {/*>*/}
                    {/*    <MapPin className="w-4 h-4 mr-2"/>*/}
                    {/*    Explore Places*/}
                    {/*</Link>*/}
                    {/*<Link*/}
                    {/*    to="/deals"*/}
                    {/*    className="flex items-center justify-center px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"*/}
                    {/*>*/}
                    {/*    <Calendar className="w-4 h-4 mr-2"/>*/}
                    {/*    Find Deals*/}
                    {/*</Link>*/}
                </div>
            </div>
        </div>
    )
}