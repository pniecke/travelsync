import { Notification, NotificationList } from "@/types";
import apiClient, { ensureCsrf } from "@/services/apiClient";
import { AxiosInstance } from "axios";

export async function getNotifications(
    unreadOnly = false,
    limit = 50,
    client: AxiosInstance = apiClient,
): Promise<NotificationList> {
    const response = await client.get<NotificationList>('/notifications', {
        params: { unreadOnly, limit },
    });
    return response.data;
}

export async function markNotificationRead(id: string): Promise<Notification> {
    await ensureCsrf();
    const response = await apiClient.post<Notification>(`/notifications/${id}/read`);
    return response.data;
}

export async function markAllNotificationsRead(): Promise<void> {
    await ensureCsrf();
    await apiClient.post('/notifications/read-all');
}
