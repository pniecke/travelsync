import {Trip} from "@/types";
import apiClient, {ensureCsrf} from "@/services/apiClient";
import {AxiosInstance} from "axios";

export async function getMyTrips(client: AxiosInstance = apiClient): Promise<Trip[]> {
    const response = await client.get<Trip[]>('/trips/my-trips');
    return response.data
}

export async function createTrip(trips: Trip[]): Promise<Trip[]> {
    await ensureCsrf();
    const response = await apiClient.post('/trips', trips);
    return response.data
}

export async function updateTrip(trip: Trip): Promise<Trip> {
    const response = await apiClient.put(`/trips/${trip.id}`, trip);
    return response.data;
}
