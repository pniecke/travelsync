package com.paullouis.travelsync.repository

import com.paullouis.travelsync.entity.SettlementEntity
import com.paullouis.travelsync.entity.TripEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface SettlementRepository : JpaRepository<SettlementEntity, UUID> {
    fun findAllByTrip(trip: TripEntity): List<SettlementEntity>
}