package com.paullouis.travelsync.service

import com.paullouis.travelsync.model.generated.Expense
import com.paullouis.travelsync.model.generated.ExpenseShare
import org.springframework.core.io.Resource
import java.util.UUID

/** A receipt file ready to be streamed back to the client. */
data class ReceiptDownload(
    val resource: Resource,
    val filename: String,
    val contentType: String,
)

interface IExpenseService {

    fun getExpenses(
        createdBy: Boolean? = null,
        paidBy: Boolean? = null,
        tripId: UUID? = null,
    ): List<Expense>

    fun createExpense(expenses: List<Expense>): List<Expense>

    fun getById(id: UUID): Expense

    fun update(id: UUID, expense: Expense): Expense

    fun delete(id: UUID)

    fun getShares(expenseId: UUID): List<ExpenseShare>

    fun replaceShares(expenseId: UUID, shares: List<ExpenseShare>): List<ExpenseShare>

    fun attachReceipt(id: UUID, filename: String?, contentType: String?, bytes: ByteArray): Expense

    fun getReceipt(id: UUID): ReceiptDownload

    fun removeReceipt(id: UUID): Expense
}
