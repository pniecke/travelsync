package com.paullouis.travelsync.utils.mapper

import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.model.Trip
import org.mapstruct.Mapper
import org.mapstruct.Mapping

@Mapper(componentModel = "spring")
interface TripMapper {

    fun toDto(tripEntity: TripEntity): Trip

    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    fun toEntity(trip: Trip): TripEntity
}