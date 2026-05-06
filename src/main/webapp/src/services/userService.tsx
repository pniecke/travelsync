import {User} from "@/types/models/User";
import apiClient from "@/services/apiClient";
import {AxiosInstance} from "axios";

export async function getLoggedInUser(client: AxiosInstance = apiClient): Promise<User> {
    const response = await client.get<User>('/user/me');
    return response.data;
}

export async function getAllUsers(client: AxiosInstance = apiClient): Promise<User[]> {
    const response = await client.get<User[]>('/users');
    return response.data;
}
