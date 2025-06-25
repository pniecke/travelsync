package com.paullouis.travelsync.service

import com.paullouis.travelsync.model.Trip
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import java.util.*

interface ITripService {

    /**
     * Retrieves all trips
     *
     * @return a list of trips
     */
    fun getAllTrips(): List<Trip>

    fun getById(id: UUID): Trip

    fun getTripsByLoggedInUser(oidcUser: OidcUser): List<Trip>

    fun createTrips(trips: List<Trip>): List<Trip>

    fun updateTrip(id: UUID, trip: Trip): Trip
}