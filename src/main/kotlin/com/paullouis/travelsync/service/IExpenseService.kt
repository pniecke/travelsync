package com.paullouis.travelsync.service

import com.paullouis.travelsync.model.generated.Expense
import com.paullouis.travelsync.model.generated.ExpenseShare
import java.util.UUID

interface IExpenseService {

    fun getExpenses(
        createdBy: Boolean? = null,
        paidBy: Boolean? = null,
        tripId: UUID? = null,
    ): List<Expense>

    fun createExpense(expenses: List<Expense>): List<Expense>

    fun getById(id: UUID): Expense

    fun delete(id: UUID)

    fun getShares(expenseId: UUID): List<ExpenseShare>

    fun replaceShares(expenseId: UUID, shares: List<ExpenseShare>): List<ExpenseShare>
}
