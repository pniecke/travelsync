package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.Trip
import com.paullouis.travelsync.service.ITripService
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/trips")
class TripController(
    private val tripService: ITripService
) {
    @GetMapping
    fun getAllTrips(): List<Trip> = tripService.getAllTrips()

    @GetMapping("/{id}")
    fun getTripById(@PathVariable id: String): Trip = tripService.getById(UUID.fromString(id))

    @GetMapping("/my-trips")
    fun getTripsByLoggedInUser(@AuthenticationPrincipal oidcUser: OidcUser): List<Trip> {
        return tripService.getTripsByLoggedInUser(oidcUser)
    }


    @PostMapping
    fun createTrip(
        @RequestBody trips: List<Trip>
    ): List<Trip> {
        return tripService.createTrips(trips)
    }

    @PutMapping("/{id}")
    fun updateTrip(
        @PathVariable id: String,
        @RequestBody trip: Trip
    ): Trip {
        return tripService.updateTrip(UUID.fromString(id), trip)
    }
}
