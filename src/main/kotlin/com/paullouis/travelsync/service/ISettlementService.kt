package com.paullouis.travelsync.service

import com.paullouis.travelsync.model.generated.CreateSettlementRequest
import com.paullouis.travelsync.model.generated.Settlement
import java.util.UUID

interface ISettlementService {

    fun list(tripId: UUID): List<Settlement>

    fun create(tripId: UUID, req: CreateSettlementRequest): Settlement

    fun delete(tripId: UUID, settlementId: UUID)
}
