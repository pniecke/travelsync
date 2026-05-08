package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.SettlementEntity
import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.model.generated.CreateSettlementRequest
import com.paullouis.travelsync.model.generated.Settlement
import com.paullouis.travelsync.repository.SettlementRepository
import com.paullouis.travelsync.repository.TripRepository
import com.paullouis.travelsync.repository.UserRepository
import com.paullouis.travelsync.service.exception.ForbiddenException
import com.paullouis.travelsync.service.exception.NotFoundException
import com.paullouis.travelsync.utils.mapper.SettlementMapper
import com.paullouis.travelsync.utils.mapper.UserMapper
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.time.LocalDateTime
import java.util.UUID

@Service
class SettlementService(
    private val tripRepository: TripRepository,
    private val userRepository: UserRepository,
    private val settlementRepository: SettlementRepository,
    private val settlementMapper: SettlementMapper,
    private val userService: UserService,
    private val userMapper: UserMapper,
) : ISettlementService {

    override fun list(tripId: UUID): List<Settlement> {
        val trip = tripRepository.findById(tripId)
            .orElseThrow { NotFoundException("Trip $tripId not found") }
        requireParticipant(trip)
        return settlementRepository.findAllByTrip(trip).map(settlementMapper::toDto)
    }

    @Transactional
    override fun create(tripId: UUID, req: CreateSettlementRequest): Settlement {
        val trip = tripRepository.findById(tripId)
            .orElseThrow { NotFoundException("Trip $tripId not found") }
        requireParticipant(trip)

        if (req.fromUserId == req.toUserId) {
            throw IllegalArgumentException("From and To must differ")
        }
        if (req.amount <= 0) {
            throw IllegalArgumentException("Amount must be positive")
        }

        val from = userRepository.findById(req.fromUserId)
            .orElseThrow { NotFoundException("User ${req.fromUserId} not found") }
        val to = userRepository.findById(req.toUserId)
            .orElseThrow { NotFoundException("User ${req.toUserId} not found") }

        val participantIds = trip.participants.mapNotNull { it.id }.toSet()
        if (from.id !in participantIds || to.id !in participantIds) {
            throw IllegalArgumentException("Both users must be trip participants")
        }

        val currentId = userService.getOrCreateUser().id
        if (currentId != from.id && currentId != to.id) {
            throw ForbiddenException("You may only record settlements involving yourself")
        }

        val saved = settlementRepository.save(
            SettlementEntity(
                trip = trip,
                fromUser = from,
                toUser = to,
                amount = req.amount,
                currency = req.currency,
                note = req.note?.takeIf { it.isNotBlank() },
                settledAt = req.settledAt ?: LocalDateTime.now(),
            ),
        )
        return settlementMapper.toDto(saved)
    }

    @Transactional
    override fun delete(tripId: UUID, settlementId: UUID) {
        val trip = tripRepository.findById(tripId)
            .orElseThrow { NotFoundException("Trip $tripId not found") }
        requireParticipant(trip)

        val settlement = settlementRepository.findById(settlementId)
            .orElseThrow { NotFoundException("Settlement $settlementId not found") }
        if (settlement.trip.id != tripId) {
            throw NotFoundException("Settlement $settlementId not found for trip $tripId")
        }

        val currentId = userService.getOrCreateUser().id
        val canDelete = currentId == settlement.fromUser.id ||
            currentId == settlement.toUser.id
        if (!canDelete) {
            throw ForbiddenException("Only the from/to user may delete this settlement")
        }
        settlementRepository.delete(settlement)
    }

    private fun requireParticipant(trip: TripEntity) {
        val current = userMapper.toEntity(userService.getOrCreateUser())
        if (trip.participants.none { it.id == current.id }) {
            throw ForbiddenException("You are not a participant of this trip")
        }
    }
}
