package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.Trip
import com.paullouis.travelsync.model.TripStatus
import com.paullouis.travelsync.service.ITripService
import org.springframework.web.bind.annotation.*
import java.time.LocalDateTime

@RestController
@RequestMapping("/api/trips")
class TripController(
    private val tripService: ITripService
) {
    @GetMapping
    fun getAllTrips(): List<Trip> = tripService.getAllTrips()

//    @GetMapping("/{id}")
//    fun getTripById(@PathVariable id: UUID): Trip? = tripService.getById(id)

    @PostMapping
    fun createTrip(
        @RequestParam name: String
    ): String {
        return tripService.createTrip(Trip(
            name = name,
            participants = listOf(),
            startTime = LocalDateTime.now(),
            endTime = LocalDateTime.now().plusDays(1),
            destination = name,
            description = name,
            status = TripStatus.IN_PROGRESS
        )).id.toString()
    }
}