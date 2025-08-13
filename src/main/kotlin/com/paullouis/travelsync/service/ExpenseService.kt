package com.paullouis.travelsync.service

import com.paullouis.travelsync.model.generated.Expense
import com.paullouis.travelsync.repository.ExpenseRepository
import com.paullouis.travelsync.repository.TripRepository
import com.paullouis.travelsync.utils.mapper.ExpenseMapper
import com.paullouis.travelsync.utils.mapper.UserMapper
import org.springframework.stereotype.Service

@Service
class ExpenseService(
    private val expenseMapper: ExpenseMapper,
    private val expenseRepository: ExpenseRepository,
    private val userService: UserService,
    private val userMapper: UserMapper,
    private val tripRepository: TripRepository
) : IExpenseService {

    override fun getExpenses(
        createdBy: Boolean?,
        paidBy: Boolean?
    ): List<Expense> {
        val userEntity = userMapper.toEntity(userService.getOrCreateUser())
        val expenseEntities = when {
            createdBy == true && paidBy == true -> {
                expenseRepository.findAllByCreatedByAndPaidBy(userEntity, userEntity)
            }

            createdBy == true -> {
                expenseRepository.findAllByCreatedBy(userEntity)
            }

            paidBy == true -> {
                expenseRepository.findAllByPaidBy(userEntity)
            }

            else -> {
                expenseRepository.findAll()
            }
        }
        return expenseEntities.map { expenseMapper.toDto(it) }
    }

    override fun createExpense(expenses: List<Expense>): List<Expense> {
        val userEntity = userMapper.toEntity(userService.getOrCreateUser())
        val expenseEntities = expenses.map { expense ->
            val tripEntity = tripRepository.findById(expense.tripId).orElse(null) // Handle case where trip is not found
                ?: throw IllegalArgumentException("Trip with ID ${expense.tripId} not found")
            expenseMapper.toEntity(expense, userEntity, tripEntity)
        }
        val savedExpenses = expenseRepository.saveAll(expenseEntities)
        return savedExpenses.map { expenseMapper.toDto(it) }
    }
}