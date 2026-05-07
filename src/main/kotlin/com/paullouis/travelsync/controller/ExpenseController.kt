package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.generated.Expense
import com.paullouis.travelsync.service.IExpenseService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
class ExpenseController(
    private val expenseService: IExpenseService
) : ExpenseApi {
    override fun getExpenses(
        createdBy: Boolean?,
        paidBy: Boolean?
    ): ResponseEntity<List<Expense>> {
        return ResponseEntity.ok(expenseService.getExpenses(createdBy, paidBy))
    }

    override fun createExpense(@Valid @RequestBody expense: List<@Valid Expense>): ResponseEntity<List<Expense>> {
        return ResponseEntity.ok(expenseService.createExpense(expense))
    }
}