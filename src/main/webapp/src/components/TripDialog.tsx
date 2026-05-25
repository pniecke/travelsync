'use client'

import {Check, Search, UserPlus, X} from "lucide-react";
import {useEffect, useState} from "react";
import {Trip, TripStatus, User} from "@/types";
import {createTrip} from "@/services/tripService";

interface TripDialogProps {
    isOpen: boolean;
    onCloseAction: () => void;
    user: User;
    allUsers: User[];
    onTripCreatedAction: () => Promise<void>;
}

interface UserSearchResult extends User {
    selected?: boolean;
}

function emptyForm(user: User): Trip {
    return {
        name: '',
        destination: '',
        description: '',
        startTime: new Date().toISOString().slice(0, 16),
        endTime: '',
        participants: [user],
        status: TripStatus.Planned,
    };
}

export default function TripDialog({
                                       isOpen,
                                       onCloseAction,
                                       user,
                                       allUsers,
                                       onTripCreatedAction,
                                   }: TripDialogProps) {
    const [form, setForm] = useState<Trip>(() => emptyForm(user));
    const [selectedParticipants, setSelectedParticipants] = useState<User[]>([user]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form whenever the dialog reopens so a previous attempt doesn't
    // leak in.
    useEffect(() => {
        if (isOpen) {
            setForm(emptyForm(user));
            setSelectedParticipants([user]);
            setSearchQuery('');
            setError(null);
        }
    }, [isOpen, user]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setSearchResults([]);
            return;
        }
        const needle = searchQuery.toLowerCase();
        const results = allUsers
            .filter(u =>
                u.username.toLowerCase().includes(needle) ||
                u.firstName?.toLowerCase().includes(needle) ||
                u.lastName?.toLowerCase().includes(needle)
            )
            .map(u => ({...u, selected: selectedParticipants.some(p => p.id === u.id)}));
        setSearchResults(results);
    }, [searchQuery, allUsers, selectedParticipants]);

    const toggleParticipant = (candidate: User) => {
        setSelectedParticipants(prev => {
            const exists = prev.some(p => p.id === candidate.id);
            return exists ? prev.filter(p => p.id !== candidate.id) : [...prev, candidate];
        });
        setSearchQuery('');
    };

    const submit = async () => {
        setIsCreating(true);
        setError(null);
        try {
            const trimmedName = form.name?.trim();
            const trimmedDescription = form.description?.trim();
            // Strip PII from participants — backend only resolves by id, and
            // empty strings on optional pattern-validated fields (e.g. mobile)
            // would fail @Valid on the request body.
            const participantRefs = selectedParticipants.map(p => ({
                id: p.id,
                username: p.username,
            } as User));
            const payload: Trip[] = [{
                participants: participantRefs,
                ...(trimmedName ? {name: trimmedName} : {}),
                destination: form.destination,
                startTime: form.startTime,
                ...(form.endTime ? {endTime: form.endTime} : {}),
                ...(trimmedDescription ? {description: trimmedDescription} : {}),
                status: TripStatus.Planned,
            }];
            await createTrip(payload);
            await onTripCreatedAction();
            onCloseAction();
        } catch (err) {
            setError("Failed to create trip. Please try again.");
            console.error("Error creating trip:", err);
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 w-full max-w-md">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-100">Create New Trip</h3>
                        <button
                            onClick={onCloseAction}
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
                                value={form.name}
                                onChange={(e) => setForm({...form, name: e.target.value})}
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
                                value={form.destination}
                                onChange={(e) => setForm({...form, destination: e.target.value})}
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
                                value={form.description}
                                onChange={(e) => setForm({...form, description: e.target.value})}
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
                                    value={form.startTime}
                                    onChange={(e) => setForm({...form, startTime: e.target.value})}
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
                                    value={form.endTime}
                                    onChange={(e) => setForm({...form, endTime: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Participants
                            </label>

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

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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

                            {searchQuery && (
                                <div className="mt-2 border border-gray-700 rounded-lg overflow-hidden">
                                    {searchResults.length > 0 ? (
                                        searchResults.map(candidate => (
                                            <div
                                                key={candidate.id}
                                                onClick={() => toggleParticipant(candidate)}
                                                className={`flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700 ${
                                                    candidate.selected ? 'bg-blue-900/30' : 'bg-gray-800'
                                                }`}
                                            >
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-100">
                                                        {candidate.firstName} {candidate.lastName}
                                                    </p>
                                                    <p className="text-sm text-gray-400">@{candidate.username}</p>
                                                </div>
                                                {candidate.selected ? (
                                                    <Check className="h-5 w-5 text-blue-400"/>
                                                ) : (
                                                    <UserPlus className="h-5 w-5 text-gray-400"/>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-center text-sm text-gray-400 bg-gray-800">
                                            No users found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            onClick={onCloseAction}
                            className="px-4 py-2 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submit}
                            disabled={isCreating || !form.destination || !form.startTime}
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
    );
}
