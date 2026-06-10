'use client'

import {Check, Copy, Mail, Share2, X} from "lucide-react";
import {useEffect, useState} from "react";
import {Trip} from "@/types";
import {createTripInvite} from "@/services/tripService";

interface ShareTripDialogProps {
    isOpen: boolean;
    onCloseAction: () => void;
    trip: Trip;
}

export default function ShareTripDialog({isOpen, onCloseAction, trip}: ShareTripDialogProps) {
    const [link, setLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Fetch (or mint) the invite token when the dialog opens, then compose the
    // absolute link from the current origin so it works in any environment.
    useEffect(() => {
        if (!isOpen || !trip.id) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setCopied(false);
        createTripInvite(trip.id)
            .then(res => {
                if (cancelled) return;
                setLink(`${window.location.origin}/trips/join/${res.token}`);
            })
            .catch(() => {
                if (!cancelled) setError("Couldn't create an invite link. Please try again.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [isOpen, trip.id]);

    const copy = async () => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError("Copy failed — select and copy the link manually.");
        }
    };

    const tripLabel = trip.name || trip.destination;
    const mailto = link
        ? `mailto:?subject=${encodeURIComponent(`Join my trip: ${tripLabel}`)}` +
          `&body=${encodeURIComponent(`I'd like you to join "${tripLabel}" on TravelSync. Open this link to join:\n\n${link}`)}`
        : "#";

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 w-full max-w-md">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-100 flex items-center">
                            <Share2 className="w-5 h-5 mr-2"/>
                            Invite to {tripLabel}
                        </h3>
                        <button onClick={onCloseAction} className="text-gray-400 hover:text-gray-300">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>

                    <p className="text-sm text-gray-400 mb-4">
                        Anyone with this link can join the trip. They&apos;ll be asked to sign in
                        or create an account first.
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center gap-2 mb-4">
                        <input
                            readOnly
                            value={loading ? "Generating link…" : (link ?? "")}
                            onFocus={(e) => e.target.select()}
                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm truncate"
                        />
                        <button
                            onClick={copy}
                            disabled={!link}
                            className="shrink-0 flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg text-sm transition-colors"
                        >
                            {copied ? <Check className="w-4 h-4 mr-1"/> : <Copy className="w-4 h-4 mr-1"/>}
                            {copied ? "Copied" : "Copy"}
                        </button>
                    </div>

                    <a
                        href={mailto}
                        className={`flex items-center justify-center px-4 py-2 border border-gray-600 rounded-lg text-gray-200 text-sm transition-colors ${
                            link ? "hover:bg-gray-700" : "pointer-events-none opacity-50"
                        }`}
                    >
                        <Mail className="w-4 h-4 mr-2"/>
                        Invite by email
                    </a>
                </div>
            </div>
        </div>
    );
}
