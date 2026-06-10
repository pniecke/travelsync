package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.ExpenseEntity
import com.paullouis.travelsync.entity.ExpenseShareEntity
import com.paullouis.travelsync.entity.SettlementEntity
import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.AuthProvider
import com.paullouis.travelsync.model.generated.Currency
import com.paullouis.travelsync.model.generated.ExpenseShareType
import com.paullouis.travelsync.model.generated.Trip
import com.paullouis.travelsync.model.generated.TripStatus
import com.paullouis.travelsync.model.generated.User
import com.paullouis.travelsync.model.generated.UserRole
import com.paullouis.travelsync.repository.ExpenseRepository
import com.paullouis.travelsync.repository.SettlementRepository
import com.paullouis.travelsync.repository.TripRepository
import com.paullouis.travelsync.repository.UserRepository
import com.paullouis.travelsync.service.exception.ConflictException
import com.paullouis.travelsync.service.exception.ForbiddenException
import com.paullouis.travelsync.service.exception.NotFoundException
import com.paullouis.travelsync.utils.mapper.TripMapper
import com.paullouis.travelsync.utils.mapper.UserMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.time.LocalDateTime
import java.util.Locale
import java.util.Optional
import java.util.UUID

/**
 * Unit tests for the trip-deletion and participant-removal guards added with
 * the trip-lifecycle feature. Repository access is mocked; the JPA queries
 * those guards depend on are exercised for real in
 * [TripFinancialQueriesIntegrationTest].
 */
class TripServiceDeleteAndRemovalTest {

    private val tripRepository: TripRepository = mock()
    private val userRepository: UserRepository = mock()
    private val expenseRepository: ExpenseRepository = mock()
    private val settlementRepository: SettlementRepository = mock()
    private val tripMapper: TripMapper = mock()
    private val userMapper: UserMapper = mock()
    private val userService: UserService = mock()
    private val notificationService: INotificationService = mock()

    private lateinit var service: TripService

    private val alice = userEntity("alice")
    private val bob = userEntity("bob")
    private val carol = userEntity("carol")

    @BeforeEach
    fun setUp() {
        service = TripService(
            tripRepository,
            userRepository,
            expenseRepository,
            settlementRepository,
            tripMapper,
            userMapper,
            userService,
            notificationService,
        )
        // Default: the current user is alice, and she is the creator.
        whenever(userService.getOrCreateUser()).thenReturn(userDto(alice))
        // Most removal tests start from a trip with no financial records.
        whenever(expenseRepository.findAllByTripWithShares(any())).thenReturn(emptyList())
        whenever(settlementRepository.findAllByTrip(any())).thenReturn(emptyList())
        // save() echoes its argument; toDto is irrelevant to the assertions.
        whenever(tripRepository.save(any<TripEntity>())).thenAnswer { it.arguments[0] }
        whenever(tripMapper.toDto(any())).thenReturn(
            Trip(
                participants = emptyList(),
                destination = "Sardinia",
                startTime = LocalDateTime.of(2026, 6, 1, 9, 0),
                status = TripStatus.PLANNED,
            )
        )
        whenever(userMapper.toEntity(any())).thenReturn(alice)
    }

    // ---- deleteTrip --------------------------------------------------------

    @Test
    fun `deleteTrip removes an empty trip owned by the current user`() {
        val trip = trip(participants = mutableListOf(alice), createdBy = alice)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))

        service.deleteTrip(trip.id!!)

        verify(tripRepository).delete(trip)
    }

    @Test
    fun `deleteTrip throws NotFound when the trip does not exist`() {
        val id = UUID.randomUUID()
        whenever(tripRepository.findById(id)).thenReturn(Optional.empty())

        assertThrows(NotFoundException::class.java) { service.deleteTrip(id) }
        verify(tripRepository, never()).delete(any<TripEntity>())
    }

    @Test
    fun `deleteTrip forbids deletion by a non-creator participant`() {
        val trip = trip(participants = mutableListOf(alice, bob), createdBy = bob)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))

        assertThrows(ForbiddenException::class.java) { service.deleteTrip(trip.id!!) }
        verify(tripRepository, never()).delete(any<TripEntity>())
    }

    @Test
    fun `deleteTrip forbids deletion of legacy trips with no recorded creator`() {
        val trip = trip(participants = mutableListOf(alice), createdBy = null)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))

        assertThrows(ForbiddenException::class.java) { service.deleteTrip(trip.id!!) }
        verify(tripRepository, never()).delete(any<TripEntity>())
    }

    @Test
    fun `deleteTrip conflicts when the trip still has expenses`() {
        val trip = trip(participants = mutableListOf(alice), createdBy = alice)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))
        whenever(expenseRepository.findAllByTripWithShares(trip))
            .thenReturn(listOf(expense(trip, paidBy = alice, amount = 10.0, currency = Currency.CHF)))

        assertThrows(ConflictException::class.java) { service.deleteTrip(trip.id!!) }
        verify(tripRepository, never()).delete(any<TripEntity>())
    }

    @Test
    fun `deleteTrip conflicts when the trip still has settlements`() {
        val trip = trip(participants = mutableListOf(alice, bob), createdBy = alice)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))
        whenever(settlementRepository.findAllByTrip(trip))
            .thenReturn(listOf(settlement(trip, from = bob, to = alice, amount = 5.0, currency = Currency.CHF)))

        assertThrows(ConflictException::class.java) { service.deleteTrip(trip.id!!) }
        verify(tripRepository, never()).delete(any<TripEntity>())
    }

    // ---- updateTrip participant-removal guard ------------------------------

    @Test
    fun `updateTrip allows removing a participant with no financial ties`() {
        val trip = trip(participants = mutableListOf(alice, bob), createdBy = alice)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))
        stubResolve(alice)

        service.updateTrip(trip.id!!, putBody(trip, participants = listOf(alice)))

        verify(tripRepository).save(any<TripEntity>())
    }

    @Test
    fun `updateTrip allows removing a participant whose balance nets to zero`() {
        // Bob paid 100 and owes his own 100 share -> net 0.
        val trip = trip(participants = mutableListOf(alice, bob), createdBy = alice)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))
        val exp = expense(trip, paidBy = bob, amount = 100.0, currency = Currency.CHF)
        exp.shares.add(share(exp, bob, 100.0))
        whenever(expenseRepository.findAllByTripWithShares(trip)).thenReturn(listOf(exp))
        stubResolve(alice)

        service.updateTrip(trip.id!!, putBody(trip, participants = listOf(alice)))

        verify(tripRepository).save(any<TripEntity>())
    }

    @Test
    fun `updateTrip rejects removing a participant who is still owed money`() {
        // Bob paid 100 but owes nothing -> he is owed 100.
        val trip = trip(participants = mutableListOf(alice, bob), createdBy = alice)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))
        val exp = expense(trip, paidBy = bob, amount = 100.0, currency = Currency.CHF)
        exp.shares.add(share(exp, alice, 100.0))
        whenever(expenseRepository.findAllByTripWithShares(trip)).thenReturn(listOf(exp))
        stubResolve(alice)

        assertThrows(ConflictException::class.java) {
            service.updateTrip(trip.id!!, putBody(trip, participants = listOf(alice)))
        }
        verify(tripRepository, never()).save(any<TripEntity>())
    }

    @Test
    fun `updateTrip rejects removing a participant who still owes a share`() {
        // Alice paid 100, bob owes a 50 share -> bob is -50.
        val trip = trip(participants = mutableListOf(alice, bob), createdBy = alice)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))
        val exp = expense(trip, paidBy = alice, amount = 100.0, currency = Currency.CHF)
        exp.shares.add(share(exp, bob, 50.0))
        whenever(expenseRepository.findAllByTripWithShares(trip)).thenReturn(listOf(exp))
        stubResolve(alice)

        assertThrows(ConflictException::class.java) {
            service.updateTrip(trip.id!!, putBody(trip, participants = listOf(alice)))
        }
        verify(tripRepository, never()).save(any<TripEntity>())
    }

    @Test
    fun `updateTrip lets a settlement cancel out a participants open share`() {
        // Bob owes a 50 share, then sends a 50 settlement -> net 0.
        val trip = trip(participants = mutableListOf(alice, bob), createdBy = alice)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))
        val exp = expense(trip, paidBy = alice, amount = 100.0, currency = Currency.CHF)
        exp.shares.add(share(exp, bob, 50.0))
        whenever(expenseRepository.findAllByTripWithShares(trip)).thenReturn(listOf(exp))
        whenever(settlementRepository.findAllByTrip(trip))
            .thenReturn(listOf(settlement(trip, from = bob, to = alice, amount = 50.0, currency = Currency.CHF)))
        stubResolve(alice)

        service.updateTrip(trip.id!!, putBody(trip, participants = listOf(alice)))

        verify(tripRepository).save(any<TripEntity>())
    }

    @Test
    fun `updateTrip rejects removal when a balance is open in any single currency`() {
        // Bob is settled in CHF but still owes 20 in EUR.
        val trip = trip(participants = mutableListOf(alice, bob), createdBy = alice)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))
        val chf = expense(trip, paidBy = bob, amount = 30.0, currency = Currency.CHF)
        chf.shares.add(share(chf, bob, 30.0))
        val eur = expense(trip, paidBy = alice, amount = 40.0, currency = Currency.EUR)
        eur.shares.add(share(eur, bob, 20.0))
        whenever(expenseRepository.findAllByTripWithShares(trip)).thenReturn(listOf(chf, eur))
        stubResolve(alice)

        assertThrows(ConflictException::class.java) {
            service.updateTrip(trip.id!!, putBody(trip, participants = listOf(alice)))
        }
        verify(tripRepository, never()).save(any<TripEntity>())
    }

    @Test
    fun `updateTrip rejects removing the last participant`() {
        val trip = trip(participants = mutableListOf(alice), createdBy = alice)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))

        assertThrows(ConflictException::class.java) {
            service.updateTrip(trip.id!!, putBody(trip, participants = emptyList()))
        }
        verify(tripRepository, never()).save(any<TripEntity>())
    }

    @Test
    fun `updateTrip forbids edits from a non-participant`() {
        val trip = trip(participants = mutableListOf(bob, carol), createdBy = bob)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))

        assertThrows(ForbiddenException::class.java) {
            service.updateTrip(trip.id!!, putBody(trip, participants = listOf(bob)))
        }
        verify(tripRepository, never()).save(any<TripEntity>())
    }

    @Test
    fun `updateTrip ignores sub-tolerance rounding dust when removing a participant`() {
        // Bob is off by 0.005 -> below BALANCE_TOLERANCE (0.01), so removal is allowed.
        val trip = trip(participants = mutableListOf(alice, bob), createdBy = alice)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))
        val exp = expense(trip, paidBy = bob, amount = 100.0, currency = Currency.CHF)
        exp.shares.add(share(exp, bob, 99.995))
        whenever(expenseRepository.findAllByTripWithShares(trip)).thenReturn(listOf(exp))
        stubResolve(alice)

        service.updateTrip(trip.id!!, putBody(trip, participants = listOf(alice)))

        verify(tripRepository).save(any<TripEntity>())
    }

    // ---- helpers -----------------------------------------------------------

    /** Stub userRepository.findById for each surviving participant resolved on update. */
    private fun stubResolve(vararg users: UserEntity) {
        users.forEach { u -> whenever(userRepository.findById(u.id!!)).thenReturn(Optional.of(u)) }
    }

    private fun putBody(existing: TripEntity, participants: List<UserEntity>): Trip =
        Trip(
            name = existing.name,
            destination = existing.destination,
            startTime = existing.startTime,
            endTime = existing.endTime,
            status = existing.status,
            participants = participants.map { userDto(it) },
        )

    private fun trip(
        participants: MutableList<UserEntity>,
        createdBy: UserEntity?,
    ) = TripEntity(
        id = UUID.randomUUID(),
        name = "Trip",
        participants = participants,
        startTime = LocalDateTime.of(2026, 6, 1, 9, 0),
        endTime = LocalDateTime.of(2026, 6, 10, 9, 0),
        destination = "Sardinia",
        status = TripStatus.PLANNED,
        createdBy = createdBy,
    )

    private fun expense(trip: TripEntity, paidBy: UserEntity, amount: Double, currency: Currency) =
        ExpenseEntity(
            id = UUID.randomUUID(),
            amount = amount,
            trip = trip,
            createdBy = paidBy,
            currency = currency,
            paidBy = paidBy,
            dateOfExpense = LocalDateTime.of(2026, 6, 2, 12, 0),
        )

    private fun share(expense: ExpenseEntity, user: UserEntity, amount: Double) =
        ExpenseShareEntity(
            id = UUID.randomUUID(),
            expense = expense,
            user = user,
            amount = amount,
            shareType = ExpenseShareType.EXACT,
        )

    private fun settlement(trip: TripEntity, from: UserEntity, to: UserEntity, amount: Double, currency: Currency) =
        SettlementEntity(
            id = UUID.randomUUID(),
            trip = trip,
            fromUser = from,
            toUser = to,
            amount = amount,
            currency = currency,
            settledAt = LocalDateTime.of(2026, 6, 3, 12, 0),
        )

    private fun userDto(entity: UserEntity) = User(id = entity.id, username = entity.username)

    private fun userEntity(username: String) = UserEntity(
        id = UUID.randomUUID(),
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
}
