import {User} from "@/types/models/User";
import apiClient from "@/services/apiClient";

export async function getLoggedInUser(): Promise<User> {
    const response = await apiClient.get<User>('/user/me');
    return response.data;
}

export async function getAllUsers(): Promise<User[]> {
    const response = await apiClient.get<User[]>('/users');
    return response.data;
}