package com.paullouis.travelsync.repository

import com.paullouis.travelsync.entity.ExpenseEntity
import com.paullouis.travelsync.entity.ExpenseShareEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface ExpenseShareRepository : JpaRepository<ExpenseShareEntity, UUID> {

    fun findAllByExpense(expense: ExpenseEntity): List<ExpenseShareEntity>

    fun deleteAllByExpense(expense: ExpenseEntity)
}