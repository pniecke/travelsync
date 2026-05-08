package com.paullouis.travelsync.utils.mapper

import com.paullouis.travelsync.entity.ExpenseShareEntity
import com.paullouis.travelsync.model.generated.ExpenseShare
import org.mapstruct.Mapper
import org.mapstruct.Mapping

@Mapper(componentModel = "spring", uses = [UserMapper::class])
interface ExpenseShareMapper {

    @Mapping(target = "user", source = "expenseShareEntity.user")
    fun toDto(expenseShareEntity: ExpenseShareEntity): ExpenseShare
}
