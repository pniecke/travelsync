'use client'

import type React from "react"
import { useState } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { Search, Bell, User, Plus, Menu, X, MapPin, Calendar, DollarSign, Settings, LogOut } from "lucide-react"

const mockUser = {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    avatar: "/placeholder.svg?height=40&width=40",
}

const mockTrips = [
    { id: "1", name: "Tokyo Adventure", lastUpdated: "2 days ago", location: "Tokyo, Japan" },
    { id: "2", name: "European Tour", lastUpdated: "1 week ago", location: "Paris, France" },
    { id: "3", name: "Beach Getaway", lastUpdated: "2 weeks ago", location: "Bali, Indonesia" },
]

export const Layout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const location = useLocation()

    const navigation = [
        { name: "Dashboard", href: "/dashboard", icon: MapPin },
        { name: "Recommendations", href: "/recommendations", icon: Calendar },
        { name: "Deals", href: "/deals", icon: DollarSign },
        { name: "Settings", href: "/settings", icon: Settings },
    ]

    const isActive = (href: string) => location.pathname === href

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-slate-200 lg:bg-white">
                <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
                    <div className="flex items-center flex-shrink-0 px-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">TS</span>
                            </div>
                            <span className="text-xl font-bold text-slate-800">TravelSync</span>
                        </div>
                    </div>

                    {/* User Profile */}
                    <div className="mt-6 px-4">
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-50">
                            <img src={mockUser.avatar || "/placeholder.svg"} alt={mockUser.name} className="w-10 h-10 rounded-full" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{mockUser.name}</p>
                                <p className="text-xs text-slate-500 truncate">{mockUser.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* New Trip Button */}
                    <div className="mt-4 px-4">
                        <button className="w-full flex items-center justify-center px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors">
                            <Plus className="w-4 h-4 mr-2" />
                            New Trip
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="mt-6 flex-1 px-4 space-y-1">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    isActive(item.href)
                                        ? "bg-sky-100 text-sky-700"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                }`}
                            >
                                <item.icon className="mr-3 h-5 w-5" />
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    {/* Recent Trips */}
                    <div className="mt-6 px-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Trips</h3>
                        <div className="space-y-2">
                            {mockTrips.map((trip) => (
                                <Link
                                    key={trip.id}
                                    to={`/trip/${trip.id}`}
                                    className="block p-3 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <p className="text-sm font-medium text-slate-900 truncate">{trip.name}</p>
                                    <p className="text-xs text-slate-500">{trip.lastUpdated}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile sidebar */}
            <div className={`lg:hidden fixed inset-0 z-40 ${sidebarOpen ? "" : "pointer-events-none"}`}>
                <div
                    className={`fixed inset-0 bg-slate-600 bg-opacity-75 transition-opacity ${
                        sidebarOpen ? "opacity-100" : "opacity-0"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                />
                <div
                    className={`fixed inset-y-0 left-0 flex flex-col w-64 bg-white transform transition-transform ${
                        sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    {/* Mobile sidebar content - same as desktop but with close button */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">TS</span>
                            </div>
                            <span className="text-xl font-bold text-slate-800">TravelSync</span>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md hover:bg-slate-100">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    {/* Rest of sidebar content */}
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64 flex flex-col flex-1">
                {/* Top bar */}
                <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white border-b border-slate-200">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="px-4 border-r border-slate-200 text-slate-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500 lg:hidden"
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <div className="flex-1 px-4 flex justify-between items-center">
                        {/* Search */}
                        <div className="flex-1 max-w-lg">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search trips, expenses..."
                                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Right side */}
                        <div className="ml-4 flex items-center space-x-4">
                            <button className="p-2 text-slate-400 hover:text-slate-500 relative">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-100"
                                >
                                    <img
                                        src={mockUser.avatar || "/placeholder.svg"}
                                        alt={mockUser.name}
                                        className="w-8 h-8 rounded-full"
                                    />
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                                        <Link
                                            to="/settings"
                                            className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                        >
                                            <User className="mr-3 h-4 w-4" />
                                            Profile
                                        </Link>
                                        <Link
                                            to="/settings"
                                            className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                        >
                                            <Settings className="mr-3 h-4 w-4" />
                                            Settings
                                        </Link>
                                        <hr className="my-1" />
                                        <button className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                                            <LogOut className="mr-3 h-4 w-4" />
                                            Sign out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>

                {/* Mobile bottom navigation */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
                    <div className="grid grid-cols-4 py-2">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex flex-col items-center py-2 px-1 ${
                                    isActive(item.href) ? "text-sky-600" : "text-slate-400"
                                }`}
                            >
                                <item.icon className="h-5 w-5" />
                                <span className="text-xs mt-1">{item.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
