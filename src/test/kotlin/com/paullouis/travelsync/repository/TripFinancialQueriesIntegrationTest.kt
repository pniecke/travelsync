package com.paullouis.travelsync.repository

import com.paullouis.travelsync.entity.ExpenseEntity
import com.paullouis.travelsync.entity.ExpenseShareEntity
import com.paullouis.travelsync.entity.SettlementEntity
import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.AuthProvider
import com.paullouis.travelsync.model.generated.Currency
import com.paullouis.travelsync.model.generated.ExpenseShareType
import com.paullouis.travelsync.model.generated.TripStatus
import com.paullouis.travelsync.model.generated.UserRole
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager
import java.time.LocalDateTime
import java.util.Locale

/**
 * Exercises the JPA queries the trip-deletion and participant-removal guards
 * rely on against a real H2 database — including the new `createdBy`
 * relationship and the `left join fetch` on expense shares. The pure branching
 * logic is covered with mocks in TripServiceDeleteAndRemovalTest.
 */
@DataJpaTest
class TripFinancialQueriesIntegrationTest {

    @Autowired
    private lateinit var em: TestEntityManager

    @Autowired
    private lateinit var expenseRepository: ExpenseRepository

    @Autowired
    private lateinit var settlementRepository: SettlementRepository

    @Autowired
    private lateinit var tripRepository: TripRepository

    @Test
    fun `createdBy relationship persists and reads back`() {
        val creator = persistUser("alice")
        val trip = persistTrip(mutableListOf(creator), createdBy = creator)
        em.flush()
        em.clear()

        val reloaded = tripRepository.findById(trip.id!!).orElseThrow()
        assertNotNull(reloaded.createdBy)
        assertEquals(creator.id, reloaded.createdBy!!.id)
    }

    @Test
    fun `trip created without a creator stays null for legacy rows`() {
        val user = persistUser("alice")
        val trip = persistTrip(mutableListOf(user), createdBy = null)
        em.flush()
        em.clear()

        val reloaded = tripRepository.findById(trip.id!!).orElseThrow()
        assertEquals(null, reloaded.createdBy)
    }

    @Test
    fun `findAllByTripWithShares returns expenses and their shares for the trip only`() {
        val alice = persistUser("alice")
        val bob = persistUser("bob")
        val trip = persistTrip(mutableListOf(alice, bob), createdBy = alice)
        val otherTrip = persistTrip(mutableListOf(alice), createdBy = alice)

        persistExpenseWithShares(trip, paidBy = bob, amount = 100.0, Currency.CHF, mapOf(alice to 50.0, bob to 50.0))
        persistExpenseWithShares(otherTrip, paidBy = alice, amount = 20.0, Currency.EUR, mapOf(alice to 20.0))
        em.flush()
        em.clear()

        val found = expenseRepository.findAllByTripWithShares(tripRepository.findById(trip.id!!).orElseThrow())

        assertEquals(1, found.size)
        // The left-join-fetch must hydrate shares (no LazyInitializationException
        // after the session is cleared, since the guard reads e.shares directly).
        assertEquals(2, found.first().shares.size)
        assertEquals(100.0, found.first().amount)
    }

    @Test
    fun `findAllByTripWithShares returns empty for a trip with no expenses`() {
        val alice = persistUser("alice")
        val trip = persistTrip(mutableListOf(alice), createdBy = alice)
        em.flush()
        em.clear()

        val found = expenseRepository.findAllByTripWithShares(tripRepository.findById(trip.id!!).orElseThrow())

        assertTrue(found.isEmpty())
    }

    @Test
    fun `findAllByTrip returns settlements scoped to the trip`() {
        val alice = persistUser("alice")
        val bob = persistUser("bob")
        val trip = persistTrip(mutableListOf(alice, bob), createdBy = alice)
        val otherTrip = persistTrip(mutableListOf(alice, bob), createdBy = alice)

        persistSettlement(trip, from = bob, to = alice, amount = 50.0, Currency.CHF)
        persistSettlement(trip, from = alice, to = bob, amount = 10.0, Currency.EUR)
        persistSettlement(otherTrip, from = bob, to = alice, amount = 5.0, Currency.CHF)
        em.flush()
        em.clear()

        val found = settlementRepository.findAllByTrip(tripRepository.findById(trip.id!!).orElseThrow())

        assertEquals(2, found.size)
    }

    // ---- helpers -----------------------------------------------------------

    private fun persistUser(username: String): UserEntity = em.persist(
        UserEntity(
            username = username,
            password = null,
            firstName = username.replaceFirstChar { it.uppercase() },
            lastName = "Last",
            email = "$username@example.com",
            mobile = "",
            locale = Locale.ENGLISH,
            roles = setOf(UserRole.USER),
            authProvider = AuthProvider.DATABASE,
        )
    )

    private fun persistTrip(participants: MutableList<UserEntity>, createdBy: UserEntity?): TripEntity = em.persist(
        TripEntity(
            name = "Trip",
            participants = participants,
            startTime = LocalDateTime.of(2026, 6, 1, 9, 0),
            endTime = LocalDateTime.of(2026, 6, 10, 9, 0),
            destination = "Sardinia",
            status = TripStatus.PLANNED,
            createdBy = createdBy,
        )
    )

    private fun persistExpenseWithShares(
        trip: TripEntity,
        paidBy: UserEntity,
        amount: Double,
        currency: Currency,
        shares: Map<UserEntity, Double>,
    ): ExpenseEntity {
        val expense = ExpenseEntity(
            amount = amount,
            trip = trip,
            createdBy = paidBy,
            currency = currency,
            paidBy = paidBy,
            dateOfExpense = LocalDateTime.of(2026, 6, 2, 12, 0),
        )
        shares.forEach { (user, share) ->
            expense.shares.add(
                ExpenseShareEntity(
                    expense = expense,
                    user = user,
                    amount = share,
                    shareType = ExpenseShareType.EXACT,
                )
            )
        }
        // cascade = ALL on shares persists the children with the parent.
        return em.persist(expense)
    }

    private fun persistSettlement(
        trip: TripEntity,
        from: UserEntity,
        to: UserEntity,
        amount: Double,
        currency: Currency,
    ): SettlementEntity = em.persist(
        SettlementEntity(
            trip = trip,
            fromUser = from,
            toUser = to,
            amount = amount,
            currency = currency,
            settledAt = LocalDateTime.of(2026, 6, 3, 12, 0),
        )
    )
}
