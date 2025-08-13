import {Expense} from "@/types";
import apiClient from "@/services/apiClient";

export async function getExpenses(filter?: {
    createdBy?: string;
    paidBy?: string;
}): Promise<Expense[]> {
    const response = await apiClient.get('/expenses', {params: filter});
    return response.data
}

export async function createExpense(expenses: Expense[]): Promise<Expense[]> {
    const response = await apiClient.post('/expenses', expenses);
    return response.data;
}