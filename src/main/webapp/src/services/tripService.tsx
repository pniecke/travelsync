import {Trip} from "@/types";
import apiClient from "@/services/apiClient";

export async function getMyTrips(): Promise<Trip[]> {
    const response = await apiClient.get<Trip[]>('/trips/my-trips');
    return response.data
}

export async function createTrip(trips: Trip[]): Promise<Trip[]> {
    const response = await apiClient.post('/trips', trips);
    return response.data
}

export async function updateTrip(trip: Trip): Promise<Trip> {
    const response = await apiClient.put(`/trips/${trip.id}`, trip);
    return response.data;
}