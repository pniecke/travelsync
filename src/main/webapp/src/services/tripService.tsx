import {Trip, TripInvitePreview, TripInviteResponse} from "@/types";
import apiClient, {ensureCsrf} from "@/services/apiClient";
import {AxiosInstance} from "axios";

export async function getMyTrips(client: AxiosInstance = apiClient): Promise<Trip[]> {
    const response = await client.get<Trip[]>('/trips/my-trips');
    return response.data
}

export async function getTripById(id: string, client: AxiosInstance = apiClient): Promise<Trip> {
    const response = await client.get<Trip>(`/trips/${id}`);
    return response.data
}

export async function createTrip(trips: Trip[]): Promise<Trip[]> {
    await ensureCsrf();
    const response = await apiClient.post('/trips', trips);
    return response.data
}

export async function updateTrip(trip: Trip): Promise<Trip> {
    await ensureCsrf();
    const response = await apiClient.put(`/trips/${trip.id}`, trip);
    return response.data;
}

export async function deleteTrip(id: string): Promise<void> {
    await ensureCsrf();
    await apiClient.delete(`/trips/${id}`);
}

export async function createTripInvite(id: string): Promise<TripInviteResponse> {
    await ensureCsrf();
    const response = await apiClient.post<TripInviteResponse>(`/trips/${id}/invite`);
    return response.data;
}

export async function getTripInvitePreview(
    token: string,
    client: AxiosInstance = apiClient,
): Promise<TripInvitePreview> {
    const response = await client.get<TripInvitePreview>(`/trips/invites/${token}`);
    return response.data;
}

export async function joinTripViaInvite(token: string): Promise<Trip> {
    await ensureCsrf();
    const response = await apiClient.post<Trip>(`/trips/invites/${token}/join`);
    return response.data;
}
