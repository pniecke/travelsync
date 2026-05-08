import apiClient from "@/services/apiClient";
import {AxiosInstance} from "axios";

export type SecurityEventType =
    | "LOGIN_FAILURE"
    | "LOGIN_SUCCESS"
    | "ACCOUNT_LOCKED"
    | "IP_LOGIN_THROTTLED"
    | "SIGNUP_THROTTLED"
    | "SIGNUP_SUCCESS";

export interface SecurityEvent {
    id: number;
    timestamp: string;
    type: SecurityEventType;
    identifier: string | null;
    ip: string | null;
    message: string;
}

export interface TopEntry {
    key: string;
    count: number;
}

export interface SecurityStats {
    total: number;
    byType: Record<SecurityEventType, number>;
    topIps: TopEntry[];
    topIdentifiers: TopEntry[];
}

export async function getSecurityEvents(
    limit = 200,
    client: AxiosInstance = apiClient,
): Promise<SecurityEvent[]> {
    const response = await client.get<SecurityEvent[]>('/admin/security-events', {
        params: {limit},
    });
    return response.data;
}

export async function getSecurityStats(
    client: AxiosInstance = apiClient,
): Promise<SecurityStats> {
    const response = await client.get<SecurityStats>('/admin/security-stats');
    return response.data;
}
