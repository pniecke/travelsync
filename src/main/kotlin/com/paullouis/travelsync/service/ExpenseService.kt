package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.ExpenseEntity
import com.paullouis.travelsync.entity.ExpenseShareEntity
import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.generated.Expense
import com.paullouis.travelsync.model.generated.ExpenseShare
import com.paullouis.travelsync.model.generated.ExpenseShareType
import com.paullouis.travelsync.repository.ExpenseRepository
import com.paullouis.travelsync.repository.ExpenseShareRepository
import com.paullouis.travelsync.repository.TripRepository
import com.paullouis.travelsync.repository.UserRepository
import com.paullouis.travelsync.service.exception.ForbiddenException
import com.paullouis.travelsync.service.exception.NotFoundException
import com.paullouis.travelsync.utils.mapper.ExpenseMapper
import com.paullouis.travelsync.utils.mapper.ExpenseShareMapper
import com.paullouis.travelsync.utils.mapper.UserMapper
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.util.UUID
import kotlin.math.abs
import kotlin.math.roundToLong

private const val ROUNDING_TOLERANCE = 0.01

@Service
class ExpenseService(
    private val expenseMapper: ExpenseMapper,
    private val expenseShareMapper: ExpenseShareMapper,
    private val expenseRepository: ExpenseRepository,
    private val expenseShareRepository: ExpenseShareRepository,
    private val tripRepository: TripRepository,
    private val userRepository: UserRepository,
    private val userService: UserService,
    private val userMapper: UserMapper,
) : IExpenseService {

    override fun getExpenses(
        createdBy: Boolean?,
        paidBy: Boolean?,
        tripId: UUID?,
    ): List<Expense> {
        val current = userMapper.toEntity(userService.getOrCreateUser())

        val byTrip = tripId?.let { id ->
            val trip = tripRepository.findById(id)
                .orElseThrow { NotFoundException("Trip $id not found") }
            requireParticipant(trip)
            expenseRepository.findAllByTripWithShares(trip)
        }

        val matching = when {
            byTrip != null -> byTrip.filter { e ->
                (createdBy != true || e.createdBy.id == current.id) &&
                    (paidBy != true || e.paidBy?.id == current.id)
            }

            createdBy == true && paidBy == true ->
                expenseRepository.findAllByCreatedByAndPaidBy(current, current)

            createdBy == true ->
                expenseRepository.findAllByCreatedBy(current)

            paidBy == true ->
                expenseRepository.findAllByPaidBy(current)

            else ->
                expenseRepository.findAll().toList()
        }

        return matching.map(expenseMapper::toDto)
    }

    @Transactional
    override fun createExpense(expenses: List<Expense>): List<Expense> {
        val current = currentUserEntity()

        val saved = expenses.map { dto ->
            val trip = tripRepository.findById(dto.tripId)
                .orElseThrow { NotFoundException("Trip ${dto.tripId} not found") }
            requireParticipant(trip)

            val payer = dto.paidBy?.id?.let { id ->
                userRepository.findById(id)
                    .orElseThrow { NotFoundException("User $id not found") }
            }

            val toSave = ExpenseEntity(
                id = dto.id,
                description = dto.description,
                amount = dto.amount,
                trip = trip,
                createdBy = current,
                currency = dto.currency,
                paidBy = payer,
                dateOfExpense = dto.dateOfExpense,
            )
            val savedExpense = expenseRepository.save(toSave)

            val shareEntities = buildShareEntities(savedExpense, trip, dto.shares)
            expenseShareRepository.saveAll(shareEntities)
            savedExpense.shares.clear()
            savedExpense.shares.addAll(shareEntities)
            savedExpense
        }
        return saved.map(expenseMapper::toDto)
    }

    override fun getById(id: UUID): Expense {
        val expense = expenseRepository.findById(id)
            .orElseThrow { NotFoundException("Expense $id not found") }
        requireParticipant(expense.trip)
        return expenseMapper.toDto(expense)
    }

    @Transactional
    override fun delete(id: UUID) {
        val expense = expenseRepository.findById(id)
            .orElseThrow { NotFoundException("Expense $id not found") }
        val current = currentUserEntity()
        // Either the creator or any trip participant can delete; restrict to
        // creator for safety. Loosen to participant if you'd rather.
        if (expense.createdBy.id != current.id) {
            throw ForbiddenException("Only the creator may delete this expense")
        }
        expenseRepository.delete(expense)
    }

    override fun getShares(expenseId: UUID): List<ExpenseShare> {
        val expense = expenseRepository.findById(expenseId)
            .orElseThrow { NotFoundException("Expense $expenseId not found") }
        requireParticipant(expense.trip)
        return expense.shares.map(expenseShareMapper::toDto)
    }

    @Transactional
    override fun replaceShares(expenseId: UUID, shares: List<ExpenseShare>): List<ExpenseShare> {
        val expense = expenseRepository.findById(expenseId)
            .orElseThrow { NotFoundException("Expense $expenseId not found") }
        requireParticipant(expense.trip)

        val newShares = buildShareEntities(expense, expense.trip, shares, allowDefault = false)

        expenseShareRepository.deleteAllByExpense(expense)
        expenseShareRepository.flush()
        val savedShares = expenseShareRepository.saveAll(newShares).toList()
        return savedShares.map(expenseShareMapper::toDto)
    }

    private fun buildShareEntities(
        expense: ExpenseEntity,
        trip: TripEntity,
        requested: List<ExpenseShare>?,
        allowDefault: Boolean = true,
    ): List<ExpenseShareEntity> {
        val participants = trip.participants
        if (participants.isEmpty()) {
            throw IllegalArgumentException("Trip has no participants to split between")
        }

        val effective = when {
            !requested.isNullOrEmpty() -> requested
            allowDefault -> defaultEqualShares(expense.amount, participants)
            else -> throw IllegalArgumentException("Shares must not be empty")
        }

        validateShares(expense.amount, trip, effective)

        val participantsById = participants.associateBy { it.id!! }
        return effective.map { share ->
            val userId = share.user.id
                ?: throw IllegalArgumentException("Share user.id is required")
            val userEntity = participantsById[userId]
                ?: throw IllegalArgumentException("User $userId is not a participant of this trip")
            ExpenseShareEntity(
                expense = expense,
                user = userEntity,
                amount = round2(share.amount),
                shareType = share.shareType,
                shareValue = share.shareValue,
            )
        }
    }

    private fun defaultEqualShares(amount: Double, participants: List<UserEntity>): List<ExpenseShare> {
        val per = amount / participants.size
        val rounded = MutableList(participants.size) { round2(per) }
        // Push the rounding remainder onto the first share so the sum matches.
        val remainder = round2(amount - rounded.sum())
        if (rounded.isNotEmpty()) {
            rounded[0] = round2(rounded[0] + remainder)
        }
        return participants.mapIndexed { i, user ->
            ExpenseShare(
                user = userMapper.toDto(user),
                amount = rounded[i],
                shareType = ExpenseShareType.EQUAL,
            )
        }
    }

    private fun validateShares(amount: Double, trip: TripEntity, shares: List<ExpenseShare>) {
        require(shares.isNotEmpty()) { "Must have at least one share" }

        val participantIds = trip.participants.mapNotNull { it.id }.toSet()
        val seen = mutableSetOf<UUID>()
        shares.forEach { share ->
            val uid = share.user.id
                ?: throw IllegalArgumentException("Share user.id is required")
            if (uid !in participantIds) {
                throw IllegalArgumentException("User $uid is not a participant of this trip")
            }
            if (!seen.add(uid)) {
                throw IllegalArgumentException("Duplicate share for user $uid")
            }
            if (share.amount < 0) {
                throw IllegalArgumentException("Share amount must be non-negative")
            }
            if (share.shareType == ExpenseShareType.PERCENT && share.shareValue == null) {
                throw IllegalArgumentException("PERCENT shares require shareValue")
            }
        }

        val sum = shares.sumOf { it.amount }
        if (abs(sum - amount) > ROUNDING_TOLERANCE) {
            throw IllegalArgumentException(
                "Shares (%.2f) must sum to expense amount (%.2f)".format(sum, amount),
            )
        }

        val percentShares = shares.filter { it.shareType == ExpenseShareType.PERCENT }
        if (percentShares.isNotEmpty() && percentShares.size == shares.size) {
            val pct = percentShares.sumOf { it.shareValue ?: 0.0 }
            if (abs(pct - 100.0) > ROUNDING_TOLERANCE) {
                throw IllegalArgumentException(
                    "Percent shares must sum to 100 (got %.2f)".format(pct),
                )
            }
        }
    }

    private fun requireParticipant(trip: TripEntity) {
        val current = currentUserEntity()
        if (trip.participants.none { it.id == current.id }) {
            throw ForbiddenException("You are not a participant of this trip")
        }
    }

    private fun currentUserEntity(): UserEntity =
        userMapper.toEntity(userService.getOrCreateUser())

    private fun round2(v: Double): Double = (v * 100).roundToLong() / 100.0
}
