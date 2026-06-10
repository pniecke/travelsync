package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.generated.Currency
import com.paullouis.travelsync.model.generated.Trip
import com.paullouis.travelsync.model.generated.User
import com.paullouis.travelsync.repository.ExpenseRepository
import com.paullouis.travelsync.repository.SettlementRepository
import com.paullouis.travelsync.repository.TripRepository
import com.paullouis.travelsync.repository.UserRepository
import com.paullouis.travelsync.service.exception.ConflictException
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
    private val expenseRepository: ExpenseRepository,
    private val settlementRepository: SettlementRepository,
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

    override fun getByIdForCurrentUser(id: UUID): Trip {
        val tripEntity: TripEntity = tripRepository.findById(id)
            .orElseThrow { NotFoundException("Trip $id not found") }
        val currentUserId = userService.getOrCreateUser().id
        if (tripEntity.participants.none { it.id == currentUserId }) {
            throw ForbiddenException("You are not a participant of this trip")
        }
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
                createdBy = actor,
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
        val newParticipantIds = participantEntities.mapNotNull { it.id }.toSet()
        val previousParticipantIds = existingTripEntity.participants.mapNotNull { it.id }.toSet()
        val addedParticipants = participantEntities.filter { it.id != null && it.id !in previousParticipantIds }
        val removedParticipants = existingTripEntity.participants.filter { it.id != null && it.id !in newParticipantIds }

        if (removedParticipants.isNotEmpty()) {
            if (participantEntities.isEmpty()) {
                throw ConflictException("A trip must keep at least one participant")
            }
            guardParticipantRemoval(existingTripEntity, removedParticipants)
        }

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

    @Transactional
    override fun deleteTrip(id: UUID) {
        val trip: TripEntity = tripRepository.findById(id)
            .orElseThrow { NotFoundException("Trip $id not found") }

        // Creator-only — falls back to denying when createdBy is unknown
        // (legacy seed data). Users on such trips can still cancel via PUT.
        val currentUserId = userService.getOrCreateUser().id
        if (trip.createdBy?.id != currentUserId) {
            throw ForbiddenException("Only the trip creator can delete this trip")
        }

        val expenseCount = expenseRepository.findAllByTripWithShares(trip).size
        val settlementCount = settlementRepository.findAllByTrip(trip).size
        if (expenseCount > 0 || settlementCount > 0) {
            throw ConflictException(
                "Trip has $expenseCount expense(s) and $settlementCount settlement(s); cancel the trip instead."
            )
        }

        tripRepository.delete(trip)
    }

    /**
     * Reject removing a participant who still has financial ties to the trip
     * (an expense they created, paid for, or owe a share of; a settlement
     * they sent or received). Forces the leaver to settle up first, matching
     * Splitwise's behaviour.
     */
    private fun guardParticipantRemoval(trip: TripEntity, removed: List<UserEntity>) {
        val removedIds = removed.mapNotNull { it.id }.toSet()
        val net: MutableMap<Pair<UUID, Currency>, Double> = mutableMapOf()

        expenseRepository.findAllByTripWithShares(trip).forEach { e ->
            val payerId = e.paidBy?.id
            if (payerId != null && payerId in removedIds) {
                net.merge(payerId to e.currency, e.amount) { a, b -> a + b }
            }
            e.shares.forEach { share ->
                val uid = share.user.id
                if (uid != null && uid in removedIds) {
                    net.merge(uid to e.currency, -share.amount) { a, b -> a + b }
                }
            }
        }
        settlementRepository.findAllByTrip(trip).forEach { s ->
            val fromId = s.fromUser.id
            if (fromId != null && fromId in removedIds) {
                net.merge(fromId to s.currency, s.amount) { a, b -> a + b }
            }
            val toId = s.toUser.id
            if (toId != null && toId in removedIds) {
                net.merge(toId to s.currency, -s.amount) { a, b -> a + b }
            }
        }

        val blockerIds = net
            .filterValues { kotlin.math.abs(it) >= BALANCE_TOLERANCE }
            .keys
            .map { it.first }
            .toSet()
        if (blockerIds.isNotEmpty()) {
            val names = removed.filter { it.id in blockerIds }.joinToString(", ") { it.username }
            throw ConflictException(
                "Cannot remove $names — they still have an open balance in this trip. Settle up first."
            )
        }
    }

    private companion object {
        const val BALANCE_TOLERANCE = 0.01
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