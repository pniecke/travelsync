package com.paullouis.travelsync.utils.mapper

import com.paullouis.travelsync.entity.ExpenseEntity
import com.paullouis.travelsync.model.generated.Expense
import org.mapstruct.Mapper
import org.mapstruct.Mapping

@Mapper(componentModel = "spring", uses = [UserMapper::class, ExpenseShareMapper::class])
interface ExpenseMapper {

    @Mapping(target = "tripId", source = "expenseEntity.trip.id")
    @Mapping(target = "shares", source = "expenseEntity.shares")
    @Mapping(
        target = "lastModified",
        expression = "java(expenseEntity.getUpdatedAt() != null ? expenseEntity.getUpdatedAt() : expenseEntity.getCreatedAt())"
    )
    fun toDto(expenseEntity: ExpenseEntity): Expense
}
