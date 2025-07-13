package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.generated.Trip
import com.paullouis.travelsync.service.ITripService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController
import java.util.*


@RestController
class TripController(
    private val tripService: ITripService
) : TripApi {

    override fun getTripsByLoggedInUser(): ResponseEntity<List<Trip>> {
        return ResponseEntity.ok(tripService.getTripsByLoggedInUser())
    }

    override fun createTrip(@RequestBody trip: List<Trip>): ResponseEntity<List<Trip>> {
        return ResponseEntity(tripService.createTrips(trip), HttpStatus.CREATED)
    }

    override fun updateTrip(
        @PathVariable id: UUID,
        @Valid @RequestBody trip: Trip
    ): ResponseEntity<Trip> {
        return ResponseEntity(tripService.updateTrip(id, trip), HttpStatus.OK)
    }
}