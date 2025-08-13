package com.paullouis.travelsync.service

import com.paullouis.travelsync.model.generated.Expense

interface IExpenseService {

    fun getExpenses(
        createdBy: Boolean? = null,
        paidBy: Boolean? = null
    ): List<Expense>

    fun createExpense(expenses: List<Expense>): List<Expense>
}