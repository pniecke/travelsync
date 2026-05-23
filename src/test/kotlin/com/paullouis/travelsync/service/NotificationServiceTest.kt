package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.ExpenseEntity
import com.paullouis.travelsync.entity.ExpenseShareEntity
import com.paullouis.travelsync.entity.NotificationEntity
import com.paullouis.travelsync.entity.NotificationType
import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.AuthProvider
import com.paullouis.travelsync.model.generated.Currency
import com.paullouis.travelsync.model.generated.ExpenseShareType
import com.paullouis.travelsync.model.generated.Notification
import com.paullouis.travelsync.model.generated.TripStatus
import com.paullouis.travelsync.model.generated.User
import com.paullouis.travelsync.model.generated.UserRole
import com.paullouis.travelsync.repository.NotificationRepository
import com.paullouis.travelsync.service.exception.ForbiddenException
import com.paullouis.travelsync.service.exception.NotFoundException
import com.paullouis.travelsync.utils.mapper.NotificationMapper
import com.paullouis.travelsync.utils.mapper.UserMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentCaptor
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

class NotificationServiceTest {

    private val notificationRepository: NotificationRepository = mock()
    private val notificationMapper: NotificationMapper = mock()
    private val userService: UserService = mock()
    private val userMapper: UserMapper = mock()

    private lateinit var service: NotificationService

    private val aliceId = UUID.randomUUID()
    private val bobId = UUID.randomUUID()
    private val carolId = UUID.randomUUID()
    private val tripId = UUID.randomUUID()
    private val expenseId = UUID.randomUUID()

    private val alice = userEntity(aliceId, "alice", "Alice", "Smith")
    private val bob = userEntity(bobId, "bob", "Bob", "Jones")
    private val carol = userEntity(carolId, "carol", "Carol", "Lee")

    @BeforeEach
    fun setUp() {
        service = NotificationService(notificationRepository, notificationMapper, userService, userMapper)

        whenever(userService.getOrCreateUser()).thenReturn(userDto(alice))
        whenever(userMapper.toEntity(any<User>())).thenReturn(alice)
        whenever(notificationRepository.save(any<NotificationEntity>())).thenAnswer { it.arguments[0] }
        whenever(notificationRepository.saveAll(any<Iterable<NotificationEntity>>()))
            .thenAnswer { (it.arguments[0] as Iterable<NotificationEntity>).toList() }
        whenever(notificationMapper.toDto(any<NotificationEntity>()))
            .thenAnswer { dto((it.arguments[0] as NotificationEntity)) }
    }

    @Test
    fun `listForCurrentUser unread only returns items and unreadCount`() {
        val rows = listOf(
            NotificationEntity(
                id = UUID.randomUUID(),
                recipient = alice,
                type = NotificationType.ADDED_TO_TRIP,
                tripId = tripId,
                title = "t",
                message = "m",
                read = false,
            ),
        )
        whenever(notificationRepository.findAllByRecipientAndReadFalseOrderByCreatedAtDesc(eq(alice), any()))
            .thenReturn(rows)
        whenever(notificationRepository.countByRecipientAndReadFalse(alice)).thenReturn(3L)

        val result = service.listForCurrentUser(unreadOnly = true, limit = 50)

        assertEquals(1, result.items.size)
        assertEquals(3L, result.unreadCount)
        verify(notificationRepository, never()).findAllByRecipientOrderByCreatedAtDesc(any(), any())
    }

    @Test
    fun `listForCurrentUser default uses non-filtered query`() {
        whenever(notificationRepository.findAllByRecipientOrderByCreatedAtDesc(eq(alice), any()))
            .thenReturn(emptyList())
        whenever(notificationRepository.countByRecipientAndReadFalse(alice)).thenReturn(0L)

        service.listForCurrentUser(unreadOnly = false, limit = 50)

        verify(notificationRepository).findAllByRecipientOrderByCreatedAtDesc(eq(alice), any())
        verify(notificationRepository, never()).findAllByRecipientAndReadFalseOrderByCreatedAtDesc(any(), any())
    }

    @Test
    fun `markRead flips read true and returns dto`() {
        val notifId = UUID.randomUUID()
        val existing = NotificationEntity(
            id = notifId, recipient = alice, type = NotificationType.ADDED_TO_TRIP,
            title = "t", message = "m", read = false,
        )
        whenever(notificationRepository.findById(notifId)).thenReturn(Optional.of(existing))

        service.markRead(notifId)

        val captor = ArgumentCaptor.forClass(NotificationEntity::class.java)
        verify(notificationRepository).save(captor.capture())
        assertTrue(captor.value.read)
    }

    @Test
    fun `markRead is idempotent when already read`() {
        val notifId = UUID.randomUUID()
        val existing = NotificationEntity(
            id = notifId, recipient = alice, type = NotificationType.ADDED_TO_TRIP,
            title = "t", message = "m", read = true,
        )
        whenever(notificationRepository.findById(notifId)).thenReturn(Optional.of(existing))

        service.markRead(notifId)

        verify(notificationRepository, never()).save(any<NotificationEntity>())
    }

    @Test
    fun `markRead rejects when recipient is not caller`() {
        val notifId = UUID.randomUUID()
        val foreign = NotificationEntity(
            id = notifId, recipient = bob, type = NotificationType.ADDED_TO_TRIP,
            title = "t", message = "m",
        )
        whenever(notificationRepository.findById(notifId)).thenReturn(Optional.of(foreign))

        assertThrows(ForbiddenException::class.java) { service.markRead(notifId) }
        verify(notificationRepository, never()).save(any<NotificationEntity>())
    }

    @Test
    fun `markRead 404 when not found`() {
        val notifId = UUID.randomUUID()
        whenever(notificationRepository.findById(notifId)).thenReturn(Optional.empty())

        assertThrows(NotFoundException::class.java) { service.markRead(notifId) }
    }

    @Test
    fun `markAllRead delegates to repository for current user`() {
        service.markAllRead()
        verify(notificationRepository).markAllReadForRecipient(alice)
    }

    @Test
    fun `notifyExpenseInvolvingYou notifies shares plus payer, excluding actor, deduped`() {
        // Alice is the actor; bob and carol are share recipients; carol also paid.
        val trip = tripEntity(name = "Italy", participants = listOf(alice, bob, carol))
        val expense = expenseEntity(trip = trip, paidBy = carol)
        expense.shares.addAll(
            listOf(
                share(expense, alice, 10.0),
                share(expense, bob, 10.0),
                share(expense, carol, 10.0),
            )
        )

        service.notifyExpenseInvolvingYou(expense, actor = alice)

        @Suppress("UNCHECKED_CAST")
        val captor = ArgumentCaptor.forClass(Iterable::class.java) as ArgumentCaptor<Iterable<NotificationEntity>>
        verify(notificationRepository).saveAll(captor.capture())
        val saved = captor.value.toList()
        // alice is excluded as actor; carol is listed once even though she's in shares AND paidBy.
        assertEquals(2, saved.size)
        val recipientIds = saved.map { it.recipient.id }.toSet()
        assertEquals(setOf(bobId, carolId), recipientIds)
        saved.forEach {
            assertEquals(NotificationType.EXPENSE_INVOLVING_YOU, it.type)
            assertEquals(tripId, it.tripId)
            assertEquals(expenseId, it.expenseId)
            assertEquals(aliceId, it.actorUserId)
        }
    }

    @Test
    fun `notifyAddedToTrip excludes actor and dedupes`() {
        val trip = tripEntity(name = "Italy", participants = listOf(alice, bob, carol))

        service.notifyAddedToTrip(trip, listOf(alice, bob, bob, carol), actor = alice)

        @Suppress("UNCHECKED_CAST")
        val captor = ArgumentCaptor.forClass(Iterable::class.java) as ArgumentCaptor<Iterable<NotificationEntity>>
        verify(notificationRepository).saveAll(captor.capture())
        val saved = captor.value.toList()
        val recipientIds = saved.map { it.recipient.id }.toSet()
        assertEquals(setOf(bobId, carolId), recipientIds)
        saved.forEach { assertEquals(NotificationType.ADDED_TO_TRIP, it.type) }
    }

    @Test
    fun `notifyAddedToTrip no-op when only actor is being added`() {
        val trip = tripEntity(name = "Italy", participants = listOf(alice))

        service.notifyAddedToTrip(trip, listOf(alice), actor = alice)

        verify(notificationRepository, never()).saveAll(any<Iterable<NotificationEntity>>())
    }

    @Test
    fun `notifyTripStarted notifies all participants`() {
        val trip = tripEntity(name = "Italy", participants = listOf(alice, bob, carol))

        service.notifyTripStarted(trip)

        @Suppress("UNCHECKED_CAST")
        val captor = ArgumentCaptor.forClass(Iterable::class.java) as ArgumentCaptor<Iterable<NotificationEntity>>
        verify(notificationRepository).saveAll(captor.capture())
        val saved = captor.value.toList()
        assertEquals(setOf(aliceId, bobId, carolId), saved.map { it.recipient.id }.toSet())
        saved.forEach {
            assertEquals(NotificationType.TRIP_STARTED, it.type)
            assertEquals(tripId, it.tripId)
        }
    }

    // ---- helpers ---------------------------------------------------------

    private fun userEntity(id: UUID, username: String, first: String, last: String) = UserEntity(
        id = id,
        username = username,
        password = null,
        firstName = first,
        lastName = last,
        email = "$username@example.com",
        mobile = "",
        locale = Locale.ENGLISH,
        roles = setOf(UserRole.USER),
        authProvider = AuthProvider.DATABASE,
    )

    private fun userDto(e: UserEntity) = User(
        id = e.id, username = e.username, firstName = e.firstName, lastName = e.lastName,
        email = e.email,
    )

    private fun tripEntity(name: String, participants: List<UserEntity>) = TripEntity(
        id = tripId,
        name = name,
        participants = participants.toMutableList(),
        startTime = LocalDateTime.now(),
        destination = "Anywhere",
        status = TripStatus.PLANNED,
    )

    private fun expenseEntity(trip: TripEntity, paidBy: UserEntity?) = ExpenseEntity(
        id = expenseId,
        description = "Dinner",
        amount = 30.0,
        trip = trip,
        createdBy = trip.participants.first(),
        currency = Currency.CHF,
        paidBy = paidBy,
        dateOfExpense = LocalDateTime.now(),
    )

    private fun share(expense: ExpenseEntity, user: UserEntity, amount: Double) = ExpenseShareEntity(
        expense = expense,
        user = user,
        amount = amount,
        shareType = ExpenseShareType.EQUAL,
        shareValue = null,
    )

    private fun dto(e: NotificationEntity) = Notification(
        id = e.id ?: UUID.randomUUID(),
        type = com.paullouis.travelsync.model.generated.NotificationType.valueOf(e.type.name),
        tripId = e.tripId,
        expenseId = e.expenseId,
        actorUserId = e.actorUserId,
        title = e.title,
        message = e.message,
        read = e.read,
        createdAt = e.createdAt ?: LocalDateTime.now(),
    )
}
