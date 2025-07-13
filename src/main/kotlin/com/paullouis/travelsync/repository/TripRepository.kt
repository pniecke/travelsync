package com.paullouis.travelsync.repository

import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import org.springframework.data.repository.CrudRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface TripRepository : CrudRepository<TripEntity, UUID> {

    /**
     * Finds all trips that contain the specified user as a participant.
     *
     * @param user The user to search for in the participants list.
     * @return A list of trips that include the specified user as a participant.
     */
    fun findByParticipantsContains(user: UserEntity): List<TripEntity> // TODO write test
}