package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.generated.Expense
import com.paullouis.travelsync.model.generated.ExpenseShare
import com.paullouis.travelsync.service.IExpenseService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class ExpenseController(
    private val expenseService: IExpenseService,
) : ExpenseApi {

    override fun getExpenses(
        createdBy: Boolean?,
        paidBy: Boolean?,
        tripId: UUID?,
    ): ResponseEntity<List<Expense>> =
        ResponseEntity.ok(expenseService.getExpenses(createdBy, paidBy, tripId))

    override fun createExpense(
        @Valid @RequestBody expense: List<@Valid Expense>,
    ): ResponseEntity<List<Expense>> =
        ResponseEntity(expenseService.createExpense(expense), HttpStatus.CREATED)

    override fun getExpense(@PathVariable id: UUID): ResponseEntity<Expense> =
        ResponseEntity.ok(expenseService.getById(id))

    override fun updateExpense(
        @PathVariable id: UUID,
        @Valid @RequestBody expense: Expense,
    ): ResponseEntity<Expense> =
        ResponseEntity.ok(expenseService.update(id, expense))

    override fun deleteExpense(@PathVariable id: UUID): ResponseEntity<Unit> {
        expenseService.delete(id)
        return ResponseEntity.noContent().build()
    }

    override fun getExpenseShares(@PathVariable id: UUID): ResponseEntity<List<ExpenseShare>> =
        ResponseEntity.ok(expenseService.getShares(id))

    override fun updateExpenseShares(
        @PathVariable id: UUID,
        @Valid @RequestBody expenseShare: List<@Valid ExpenseShare>,
    ): ResponseEntity<List<ExpenseShare>> =
        ResponseEntity.ok(expenseService.replaceShares(id, expenseShare))
}
