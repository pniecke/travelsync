package com.paullouis.travelsync.utils.mapper

import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.model.generated.Trip
import org.mapstruct.Mapper
import org.mapstruct.Mapping

@Mapper(componentModel = "spring", uses = [UserMapper::class, ExpenseMapper::class])
interface TripMapper {

    @Mapping(source = "createdBy.id", target = "createdById")
    fun toDto(tripEntity: TripEntity): Trip
}