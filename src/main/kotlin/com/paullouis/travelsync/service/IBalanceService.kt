package com.paullouis.travelsync.service

import com.paullouis.travelsync.model.generated.TripBalances
import java.util.UUID

interface IBalanceService {
    fun balancesFor(tripId: UUID): TripBalances
}
