package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.generated.Trip
import com.paullouis.travelsync.model.generated.User
import com.paullouis.travelsync.repository.TripRepository
import com.paullouis.travelsync.repository.UserRepository
import com.paullouis.travelsync.service.exception.ForbiddenException
import com.paullouis.travelsync.service.exception.NotFoundException
import com.paullouis.travelsync.utils.mapper.TripMapper
import com.paullouis.travelsync.utils.mapper.UserMapper
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.util.*

@Service
class TripService(
    private val tripRepository: TripRepository,
    private val userRepository: UserRepository,
    private val tripMapper: TripMapper,
    private val userMapper: UserMapper,
    private val userService: UserService,
    private val notificationService: INotificationService,
) : ITripService {

    override fun getAllTrips(): List<Trip> {
        val tripEntities: List<TripEntity> = tripRepository.findAll().toList()
        val trips: List<Trip> = tripEntities.map { tripMapper.toDto(it) }
        return trips
    }

    override fun getById(id: UUID): Trip {
        val tripEntity: TripEntity = tripRepository.findById(id)
            .orElseThrow { NotFoundException("Trip $id not found") }
        return tripMapper.toDto(tripEntity)
    }

    override fun getTripsByLoggedInUser(): List<Trip> {
        val currentUser: UserEntity =
            userMapper.toEntity(userService.getOrCreateUser())
        val tripEntities: List<TripEntity> = tripRepository.findByParticipantsContains(currentUser)
        return tripEntities.map { tripMapper.toDto(it) }
    }

    @Transactional
    override fun createTrips(trips: List<Trip>): List<Trip> {
        val actor = userMapper.toEntity(userService.getOrCreateUser())
        val tripEntities: List<TripEntity> = trips.map { trip ->
            TripEntity(
                name = trip.name,
                participants = resolveParticipants(trip.participants).toMutableList(),
                startTime = trip.startTime,
                endTime = trip.endTime,
                destination = trip.destination,
                description = trip.description,
                status = trip.status,
            )
        }
        val savedTrips = tripRepository.saveAll(tripEntities).toList()
        savedTrips.forEach { saved ->
            notificationService.notifyAddedToTrip(saved, saved.participants, actor)
        }
        return savedTrips.map { tripMapper.toDto(it) }
    }

    @Transactional
    override fun updateTrip(id: UUID, trip: Trip): Trip {
        val existingTripEntity: TripEntity = tripRepository.findById(id)
            .orElseThrow { NotFoundException("Trip $id not found") }

        // Only existing participants may modify the trip. Without this any
        // authenticated user could PUT /trips/{id} as long as they knew the UUID.
        val currentUserId = userService.getOrCreateUser().id
        if (existingTripEntity.participants.none { it.id == currentUserId }) {
            throw ForbiddenException("You are not a participant of this trip")
        }

        val participantEntities = resolveParticipants(trip.participants)
        val previousParticipantIds = existingTripEntity.participants.mapNotNull { it.id }.toSet()
        val addedParticipants = participantEntities.filter { it.id != null && it.id !in previousParticipantIds }

        var updatedTrip = existingTripEntity.copy(
            name = trip.name,
            participants = participantEntities.toMutableList(),
            startTime = trip.startTime,
            endTime = trip.endTime ?: existingTripEntity.endTime,
            destination = trip.destination,
            description = trip.description ?: existingTripEntity.description,
            status = trip.status,
        )
        updatedTrip = tripRepository.save(updatedTrip)

        if (addedParticipants.isNotEmpty()) {
            val actor = userMapper.toEntity(userService.getOrCreateUser())
            notificationService.notifyAddedToTrip(updatedTrip, addedParticipants, actor)
        }
        return tripMapper.toDto(updatedTrip)
    }

    /**
     * Resolve participant DTOs to managed UserEntity rows. The DTOs from
     * /users intentionally omit PII (email, mobile, etc.), so reconstructing
     * a UserEntity from them via the mapper would fail Kotlin's non-null
     * checks. Look up each participant by id instead.
     */
    private fun resolveParticipants(participants: List<User>): List<UserEntity> =
        participants.map { dto ->
            val id = dto.id
                ?: throw IllegalArgumentException("Participant id is required")
            userRepository.findById(id)
                .orElseThrow { NotFoundException("User $id not found") }
        }
}