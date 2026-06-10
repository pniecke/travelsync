'use client'

import {GetServerSideProps} from "next";
import {useRouter} from "next/router";
import {AxiosError} from "axios";
import {AlertTriangle, Calendar, Check, MapPin, UserPlus, Users} from "lucide-react";
import {useState} from "react";
import {createServerApiClient} from "@/services/apiClient";
import {getTripInvitePreview, joinTripViaInvite} from "@/services/tripService";
import {ApiError, TripInvitePreview} from "@/types";
import {formatDate} from "@/utils/date";

interface PageProps {
    token: string;
    preview: TripInvitePreview;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
    const token = ctx.params?.token as string;
    const joinPath = `/trips/join/${token}`;
    const cookieHeader = ctx.req.headers.cookie;

    // Not signed in -> bounce through login, then come back here. This is the
    // non-user onboarding path: they sign up, land back on the invite, join.
    if (!cookieHeader) {
        return {redirect: {destination: `/login?returnUrl=${encodeURIComponent(joinPath)}`, permanent: false}};
    }

    const ssrClient = createServerApiClient(cookieHeader);
    try {
        const preview = await getTripInvitePreview(token, ssrClient);
        return {props: {token, preview}};
    } catch (e) {
        const status = (e as AxiosError)?.response?.status;
        if (status === 401) {
            return {redirect: {destination: `/login?returnUrl=${encodeURIComponent(joinPath)}`, permanent: false}};
        }
        // 404 / anything else -> show the invalid-invite state.
        return {notFound: true};
    }
};

export default function JoinTripPage({token, preview}: PageProps) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const tripLabel = preview.name || preview.destination;

    const join = async () => {
        setBusy(true);
        setError(null);
        try {
            const trip = await joinTripViaInvite(token);
            await router.push(`/trips/${trip.id}`);
        } catch (err) {
            const apiMessage = (err as AxiosError<ApiError>)?.response?.data?.error;
            setError(apiMessage || "Couldn't join this trip. Please try again.");
            setBusy(false);
        }
    };

    const goToTrip = () => router.push(`/trips/${preview.tripId}`);

    return (
        <div className="p-6 max-w-lg mx-auto">
            <div className="mt-10 bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">
                        {preview.invitedByName
                            ? `${preview.invitedByName} invited you to`
                            : "You've been invited to"}
                    </p>
                    <h1 className="text-2xl font-bold text-gray-100">{tripLabel}</h1>
                </div>

                <div className="p-6 space-y-3">
                    {preview.name && (
                        <div className="flex items-center text-gray-300">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0"/>
                            {preview.destination}
                        </div>
                    )}
                    {preview.startTime && (
                        <div className="flex items-center text-gray-300">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400 shrink-0"/>
                            {formatDate(preview.startTime)}
                            {preview.endTime && ` – ${formatDate(preview.endTime)}`}
                        </div>
                    )}
                    <div className="flex items-center text-gray-300">
                        <Users className="w-4 h-4 mr-2 text-gray-400 shrink-0"/>
                        {preview.participantCount} {preview.participantCount === 1 ? "participant" : "participants"}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/>
                            <span>{error}</span>
                        </div>
                    )}

                    {preview.alreadyParticipant ? (
                        <div className="pt-2 space-y-3">
                            <p className="flex items-center text-emerald-400 text-sm">
                                <Check className="w-4 h-4 mr-2"/>
                                You&apos;re already on this trip.
                            </p>
                            <button
                                onClick={goToTrip}
                                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                            >
                                Go to trip
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={join}
                            disabled={busy}
                            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg transition-colors mt-2"
                        >
                            <UserPlus className="w-4 h-4 mr-2"/>
                            {busy ? "Joining…" : "Join trip"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
