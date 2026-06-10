package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.generated.CreateSettlementRequest
import com.paullouis.travelsync.model.generated.Settlement
import com.paullouis.travelsync.model.generated.Trip
import com.paullouis.travelsync.model.generated.TripBalances
import com.paullouis.travelsync.service.IBalanceService
import com.paullouis.travelsync.service.ISettlementService
import com.paullouis.travelsync.service.ITripService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController
import java.util.UUID


@RestController
class TripController(
    private val tripService: ITripService,
    private val settlementService: ISettlementService,
    private val balanceService: IBalanceService,
) : TripApi {

    override fun getTripsByLoggedInUser(): ResponseEntity<List<Trip>> {
        return ResponseEntity.ok(tripService.getTripsByLoggedInUser())
    }

    override fun getTripById(@PathVariable id: UUID): ResponseEntity<Trip> {
        return ResponseEntity.ok(tripService.getByIdForCurrentUser(id))
    }

    override fun deleteTrip(@PathVariable id: UUID): ResponseEntity<Unit> {
        tripService.deleteTrip(id)
        return ResponseEntity.noContent().build()
    }

    override fun createTrip(@Valid @RequestBody trip: List<@Valid Trip>): ResponseEntity<List<Trip>> {
        return ResponseEntity(tripService.createTrips(trip), HttpStatus.CREATED)
    }

    override fun updateTrip(
        @PathVariable id: UUID,
        @Valid @RequestBody trip: Trip,
    ): ResponseEntity<Trip> {
        return ResponseEntity(tripService.updateTrip(id, trip), HttpStatus.OK)
    }

    override fun getTripBalances(@PathVariable id: UUID): ResponseEntity<TripBalances> =
        ResponseEntity.ok(balanceService.balancesFor(id))

    override fun getTripSettlements(@PathVariable id: UUID): ResponseEntity<List<Settlement>> =
        ResponseEntity.ok(settlementService.list(id))

    override fun createSettlement(
        @PathVariable id: UUID,
        @Valid @RequestBody createSettlementRequest: CreateSettlementRequest,
    ): ResponseEntity<Settlement> =
        ResponseEntity(settlementService.create(id, createSettlementRequest), HttpStatus.CREATED)

    override fun deleteSettlement(
        @PathVariable id: UUID,
        @PathVariable settlementId: UUID,
    ): ResponseEntity<Unit> {
        settlementService.delete(id, settlementId)
        return ResponseEntity.noContent().build()
    }
}
