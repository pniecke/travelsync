package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.generated.Currency
import com.paullouis.travelsync.model.generated.SuggestedSettlement
import com.paullouis.travelsync.model.generated.TripBalances
import com.paullouis.travelsync.model.generated.UserBalance
import com.paullouis.travelsync.repository.ExpenseRepository
import com.paullouis.travelsync.repository.SettlementRepository
import com.paullouis.travelsync.repository.TripRepository
import com.paullouis.travelsync.service.exception.ForbiddenException
import com.paullouis.travelsync.service.exception.NotFoundException
import com.paullouis.travelsync.utils.mapper.UserMapper
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.util.UUID
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.roundToLong

private const val SETTLE_TOLERANCE = 0.01

@Service
class BalanceService(
    private val tripRepository: TripRepository,
    private val expenseRepository: ExpenseRepository,
    private val settlementRepository: SettlementRepository,
    private val userMapper: UserMapper,
    private val userService: UserService,
) : IBalanceService {

    @Transactional
    override fun balancesFor(tripId: UUID): TripBalances {
        val trip = tripRepository.findById(tripId)
            .orElseThrow { NotFoundException("Trip $tripId not found") }
        requireParticipant(trip)

        val net: MutableMap<Pair<UUID, Currency>, Double> = mutableMapOf()
        val users: MutableMap<UUID, UserEntity> = mutableMapOf()
        trip.participants.forEach { p -> p.id?.let { users[it] = p } }

        expenseRepository.findAllByTripWithShares(trip).forEach { e ->
            val payer = e.paidBy
            val payerId = payer?.id
            if (payer != null && payerId != null) {
                users[payerId] = payer
                net.merge(payerId to e.currency, e.amount) { a, b -> a + b }
            }
            e.shares.forEach { share ->
                val u = share.user
                val uid = u.id
                if (uid != null) {
                    users[uid] = u
                    net.merge(uid to e.currency, -share.amount) { a, b -> a + b }
                }
            }
        }

        settlementRepository.findAllByTrip(trip).forEach { s ->
            val fromId = s.fromUser.id ?: return@forEach
            val toId = s.toUser.id ?: return@forEach
            users[fromId] = s.fromUser
            users[toId] = s.toUser
            // From-user paid To-user → From's debt decreases (balance up),
            // To's credit decreases (balance down).
            net.merge(fromId to s.currency, s.amount) { a, b -> a + b }
            net.merge(toId to s.currency, -s.amount) { a, b -> a + b }
        }

        net.replaceAll { _, v -> round2(v) }

        val balances = net.map { (key, value) ->
            val (uid, currency) = key
            UserBalance(
                user = userMapper.toDto(users.getValue(uid)),
                currency = currency,
                net = value,
            )
        }

        val suggested = simplify(net, users)

        return TripBalances(
            tripId = tripId,
            balances = balances,
            suggestedSettlements = suggested,
        )
    }

    /**
     * Greedy debt simplification per currency: repeatedly pair the largest
     * creditor with the largest debtor. Produces ≤ N-1 suggestions per
     * currency for N participants.
     */
    private fun simplify(
        net: Map<Pair<UUID, Currency>, Double>,
        users: Map<UUID, UserEntity>,
    ): List<SuggestedSettlement> {
        val byCurrency = net.entries.groupBy({ it.key.second }, { it.key.first to it.value })
        val out = mutableListOf<SuggestedSettlement>()

        byCurrency.forEach { (currency, entries) ->
            // Mutable per-currency working copies.
            val creditors = entries
                .filter { it.second > SETTLE_TOLERANCE }
                .sortedByDescending { it.second }
                .map { it.first to it.second }
                .toMutableList()
            val debtors = entries
                .filter { it.second < -SETTLE_TOLERANCE }
                .sortedBy { it.second }
                .map { it.first to it.second }
                .toMutableList()

            var ci = 0
            var di = 0
            while (ci < creditors.size && di < debtors.size) {
                val (cId, cAmt) = creditors[ci]
                val (dId, dAmt) = debtors[di]
                val pay = round2(min(cAmt, -dAmt))
                if (pay <= SETTLE_TOLERANCE) break

                out += SuggestedSettlement(
                    fromUser = userMapper.toDto(users.getValue(dId)),
                    toUser = userMapper.toDto(users.getValue(cId)),
                    currency = currency,
                    amount = pay,
                )

                creditors[ci] = cId to round2(cAmt - pay)
                debtors[di] = dId to round2(dAmt + pay)
                if (creditors[ci].second <= SETTLE_TOLERANCE) ci++
                if (abs(debtors[di].second) <= SETTLE_TOLERANCE) di++
            }
        }
        return out
    }

    private fun requireParticipant(trip: TripEntity) {
        val current = userMapper.toEntity(userService.getOrCreateUser())
        if (trip.participants.none { it.id == current.id }) {
            throw ForbiddenException("You are not a participant of this trip")
        }
    }

    private fun round2(v: Double): Double = (v * 100).roundToLong() / 100.0
}
