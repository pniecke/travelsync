import {Expense} from "@/types";
import apiClient from "@/services/apiClient";
import {AxiosInstance} from "axios";

export async function getExpenses(
    filter?: {
        createdBy?: string;
        paidBy?: string;
    },
    client: AxiosInstance = apiClient,
): Promise<Expense[]> {
    const response = await client.get('/expenses', {params: filter});
    return response.data
}

export async function createExpense(expenses: Expense[]): Promise<Expense[]> {
    const response = await apiClient.post('/expenses', expenses);
    return response.data;
}
