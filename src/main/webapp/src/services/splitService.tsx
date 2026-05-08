import {
    CreateSettlementRequest,
    ExpenseShare,
    Settlement,
    TripBalances,
} from "@/types";
import apiClient from "@/services/apiClient";
import { AxiosInstance } from "axios";

export async function getTripBalances(
    tripId: string,
    client: AxiosInstance = apiClient,
): Promise<TripBalances> {
    const response = await client.get<TripBalances>(`/trips/${tripId}/balances`);
    return response.data;
}

export async function getTripSettlements(
    tripId: string,
    client: AxiosInstance = apiClient,
): Promise<Settlement[]> {
    const response = await client.get<Settlement[]>(`/trips/${tripId}/settlements`);
    return response.data;
}

export async function createSettlement(
    tripId: string,
    payload: CreateSettlementRequest,
): Promise<Settlement> {
    const response = await apiClient.post<Settlement>(
        `/trips/${tripId}/settlements`,
        payload,
    );
    return response.data;
}

export async function deleteSettlement(
    tripId: string,
    settlementId: string,
): Promise<void> {
    await apiClient.delete(`/trips/${tripId}/settlements/${settlementId}`);
}

export async function updateExpenseShares(
    expenseId: string,
    shares: ExpenseShare[],
): Promise<ExpenseShare[]> {
    const response = await apiClient.put<ExpenseShare[]>(
        `/expenses/${expenseId}/shares`,
        shares,
    );
    return response.data;
}

export async function getExpenseShares(
    expenseId: string,
    client: AxiosInstance = apiClient,
): Promise<ExpenseShare[]> {
    const response = await client.get<ExpenseShare[]>(`/expenses/${expenseId}/shares`);
    return response.data;
}
