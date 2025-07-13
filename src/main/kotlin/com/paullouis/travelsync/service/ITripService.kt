package com.paullouis.travelsync.service

import com.paullouis.travelsync.model.generated.Trip
import java.util.*

interface ITripService {

    /**
     * Retrieves all trips
     *
     * @return a list of trips
     */
    fun getAllTrips(): List<Trip>

    fun getById(id: UUID): Trip

    fun getTripsByLoggedInUser(): List<Trip>

    fun createTrips(trips: List<Trip>): List<Trip>

    fun updateTrip(id: UUID, trip: Trip): Trip
}