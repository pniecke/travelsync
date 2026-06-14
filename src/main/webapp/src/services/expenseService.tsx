import {Expense} from "@/types";
import apiClient from "@/services/apiClient";
import {AxiosInstance} from "axios";

export async function getExpenses(
    filter?: {
        createdBy?: string;
        paidBy?: string;
        tripId?: string;
    },
    client: AxiosInstance = apiClient,
): Promise<Expense[]> {
    const response = await client.get('/expenses', {params: filter});
    return response.data
}

export async function createExpense(
    expenses: Expense[],
): Promise<Expense[]> {
    const response = await apiClient.post('/expenses', expenses);
    return response.data;
}

export async function getExpense(
    id: string,
    client: AxiosInstance = apiClient,
): Promise<Expense> {
    const response = await client.get(`/expenses/${id}`);
    return response.data;
}

export async function updateExpense(
    id: string,
    expense: Expense,
): Promise<Expense> {
    const response = await apiClient.put(`/expenses/${id}`, expense);
    return response.data;
}

export async function deleteExpense(id: string): Promise<void> {
    await apiClient.delete(`/expenses/${id}`);
}

/**
 * Browser URL for an expense's receipt. Goes through the Next.js `/api` proxy
 * so the session cookie is sent automatically — usable directly as an
 * <img> src or anchor href.
 */
export function receiptUrl(id: string): string {
    return `/api/expenses/${id}/receipt`;
}

export async function uploadReceipt(id: string, file: File): Promise<Expense> {
    const formData = new FormData();
    formData.append('file', file);
    // Let the browser set multipart/form-data with the correct boundary; the
    // shared client otherwise defaults Content-Type to application/json.
    const response = await apiClient.post(`/expenses/${id}/receipt`, formData, {
        headers: {'Content-Type': undefined},
    });
    return response.data;
}

export async function deleteReceipt(id: string): Promise<Expense> {
    const response = await apiClient.delete(`/expenses/${id}/receipt`);
    return response.data;
}
