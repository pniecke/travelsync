package com.paullouis.travelsync.utils.mapper

import com.paullouis.travelsync.entity.ExpenseEntity
import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.generated.Expense
import org.mapstruct.Mapper
import org.mapstruct.Mapping

@Mapper(componentModel = "spring", uses = [UserMapper::class])
interface ExpenseMapper {

    @Mapping(target = "tripId", source = "expenseEntity.trip.id")
    fun toDto(expenseEntity: ExpenseEntity): Expense

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "description", source = "expense.description")
    fun toEntity(expense: Expense, createdBy: UserEntity, trip: TripEntity): ExpenseEntity
}