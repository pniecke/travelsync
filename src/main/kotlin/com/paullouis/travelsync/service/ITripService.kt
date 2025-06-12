package com.paullouis.travelsync.service

import com.paullouis.travelsync.model.Trip
import java.util.UUID

interface ITripService {

    /**
     * Retrieves all trips
     *
     * @return a list of trips
     */
    fun getAllTrips(): List<Trip>

    fun getById(id: UUID): Trip?

    fun createTrip(trip: Trip): Trip
}