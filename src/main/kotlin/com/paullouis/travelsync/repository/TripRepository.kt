package com.paullouis.travelsync.repository

import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.generated.TripStatus
import org.springframework.data.repository.CrudRepository
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
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

    fun findAllByStatusAndStartTimeLessThanEqual(
        status: TripStatus,
        startTime: LocalDateTime,
    ): List<TripEntity>

    fun findAllByStatusAndEndTimeIsNotNullAndEndTimeLessThanEqual(
        status: TripStatus,
        endTime: LocalDateTime,
    ): List<TripEntity>

    fun findByInviteToken(inviteToken: String): TripEntity?
}