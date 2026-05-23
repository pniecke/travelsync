import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "@/services/notificationService";
import { Notification, NotificationList } from "@/types";

const NOTIFICATIONS_KEY = ["notifications"] as const;

export function useNotifications(enabled = true) {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery<NotificationList, Error>({
        queryKey: NOTIFICATIONS_KEY,
        queryFn: () => getNotifications(),
        refetchInterval: 30_000,
        refetchIntervalInBackground: false,
        staleTime: 10_000,
        retry: false,
        enabled,
    });

    const markRead = useMutation<Notification, Error, string>({
        mutationFn: (id) => markNotificationRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
        },
    });

    const markAllRead = useMutation<void, Error, void>({
        mutationFn: () => markAllNotificationsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
        },
    });

    return {
        notifications: data?.items ?? [],
        unreadCount: data?.unreadCount ?? 0,
        isLoading,
        markRead: (id: string) => markRead.mutate(id),
        markAllRead: () => markAllRead.mutate(),
    };
}
