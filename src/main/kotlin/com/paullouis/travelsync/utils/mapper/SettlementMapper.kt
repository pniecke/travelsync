package com.paullouis.travelsync.utils.mapper

import com.paullouis.travelsync.entity.SettlementEntity
import com.paullouis.travelsync.model.generated.Settlement
import org.mapstruct.Mapper
import org.mapstruct.Mapping

@Mapper(componentModel = "spring", uses = [UserMapper::class])
interface SettlementMapper {

    @Mapping(target = "tripId", source = "settlementEntity.trip.id")
    @Mapping(target = "fromUser", source = "settlementEntity.fromUser")
    @Mapping(target = "toUser", source = "settlementEntity.toUser")
    fun toDto(settlementEntity: SettlementEntity): Settlement
}
