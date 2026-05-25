'use client'

import {Calendar, MapPin, Users} from "lucide-react";
import {Trip, User} from "@/types";
import {formatDate} from "@/utils/date";
import {tripExpenseTotals} from "@/utils/trip";

interface TripOverviewTabProps {
    user: User;
    trip: Trip;
}

function participantName(p: User, currentUserId?: string): string {
    const base = p.firstName || p.username;
    return p.id === currentUserId ? `${base} (You)` : base;
}

export default function TripOverviewTab({user, trip}: TripOverviewTabProps) {
    const totals = tripExpenseTotals(trip);

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-100 mb-4">Details</h2>
                <div className="space-y-3 text-sm">
                    <div className="flex items-start text-gray-300">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400 shrink-0"/>
                        <span>{trip.destination}</span>
                    </div>
                    <div className="flex items-start text-gray-300">
                        <Calendar className="w-4 h-4 mr-2 mt-0.5 text-gray-400 shrink-0"/>
                        <span>
                            {formatDate(trip.startTime)}
                            {trip.endTime && ` – ${formatDate(trip.endTime)}`}
                        </span>
                    </div>
                    {trip.description && (
                        <p className="text-gray-300 pt-2 border-t border-gray-700">
                            {trip.description}
                        </p>
                    )}
                </div>
            </div>

            <div className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-400"/>
                    Participants ({trip.participants?.length ?? 0})
                </h2>
                {(!trip.participants || trip.participants.length === 0) ? (
                    <p className="text-gray-400 text-sm">No participants.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {trip.participants.map(p => (
                            <span
                                key={p.id}
                                className="inline-flex items-center bg-gray-700 rounded-full px-3 py-1 text-sm text-gray-100"
                            >
                                {participantName(p, user.id)}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-100 mb-4">Spending</h2>
                {totals.length === 0 ? (
                    <p className="text-gray-400 text-sm">No expenses recorded yet.</p>
                ) : (
                    <div className="space-y-2">
                        {totals.map(([cur, sum]) => (
                            <div key={cur} className="flex items-center justify-between text-gray-100">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{cur}</span>
                                <span className="tabular-nums font-medium">{sum.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
