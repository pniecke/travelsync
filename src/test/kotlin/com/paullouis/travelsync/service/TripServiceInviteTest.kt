package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.AuthProvider
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
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentCaptor
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.time.LocalDateTime
import java.util.Locale
import java.util.Optional
import java.util.UUID

/** Unit tests for the trip-invite (share-link) service methods. */
class TripServiceInviteTest {

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

    @BeforeEach
    fun setUp() {
        service = TripService(
            tripRepository, userRepository, expenseRepository, settlementRepository,
            tripMapper, userMapper, userService, notificationService,
        )
        whenever(userService.getOrCreateUser()).thenReturn(userDto(alice))
        whenever(tripRepository.save(any<TripEntity>())).thenAnswer { it.arguments[0] }
        whenever(tripMapper.toDto(any())).thenReturn(
            Trip(
                participants = emptyList(),
                destination = "Sardinia",
                startTime = LocalDateTime.of(2026, 6, 1, 9, 0),
                status = TripStatus.PLANNED,
            )
        )
    }

    // ---- createInvite ------------------------------------------------------

    @Test
    fun `createInvite returns the existing token without re-saving`() {
        val trip = trip(participants = mutableListOf(alice), token = "existing-token")
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))

        val res = service.createInvite(trip.id!!)

        assertEquals("existing-token", res.token)
        verify(tripRepository, never()).save(any<TripEntity>())
    }

    @Test
    fun `createInvite mints and persists a token on first call`() {
        val trip = trip(participants = mutableListOf(alice), token = null)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))

        val res = service.createInvite(trip.id!!)

        assertTrue(res.token.isNotBlank())
        val captor = ArgumentCaptor.forClass(TripEntity::class.java)
        verify(tripRepository).save(captor.capture())
        assertEquals(res.token, captor.value.inviteToken)
    }

    @Test
    fun `createInvite forbids non-participants`() {
        val trip = trip(participants = mutableListOf(bob), token = null)
        whenever(tripRepository.findById(trip.id!!)).thenReturn(Optional.of(trip))

        assertThrows(ForbiddenException::class.java) { service.createInvite(trip.id!!) }
        verify(tripRepository, never()).save(any<TripEntity>())
    }

    @Test
    fun `createInvite throws NotFound for an unknown trip`() {
        val id = UUID.randomUUID()
        whenever(tripRepository.findById(id)).thenReturn(Optional.empty())

        assertThrows(NotFoundException::class.java) { service.createInvite(id) }
    }

    // ---- getInvitePreview --------------------------------------------------

    @Test
    fun `getInvitePreview reports alreadyParticipant true for a member`() {
        val trip = trip(participants = mutableListOf(alice, bob), token = "tok", createdBy = bob)
        whenever(tripRepository.findByInviteToken("tok")).thenReturn(trip)

        val preview = service.getInvitePreview("tok")

        assertTrue(preview.alreadyParticipant)
        assertEquals(2, preview.participantCount)
        assertEquals("Bob Last", preview.invitedByName)
        assertEquals(trip.id, preview.tripId)
    }

    @Test
    fun `getInvitePreview reports alreadyParticipant false for a non-member`() {
        val trip = trip(participants = mutableListOf(bob), token = "tok", createdBy = bob)
        whenever(tripRepository.findByInviteToken("tok")).thenReturn(trip)

        val preview = service.getInvitePreview("tok")

        assertFalse(preview.alreadyParticipant)
        assertEquals(1, preview.participantCount)
    }

    @Test
    fun `getInvitePreview throws NotFound for an unknown token`() {
        whenever(tripRepository.findByInviteToken("nope")).thenReturn(null)

        assertThrows(NotFoundException::class.java) { service.getInvitePreview("nope") }
    }

    // ---- joinViaInvite -----------------------------------------------------

    @Test
    fun `joinViaInvite adds the current user to the trip`() {
        val trip = trip(participants = mutableListOf(bob), token = "tok")
        whenever(tripRepository.findByInviteToken("tok")).thenReturn(trip)
        whenever(userRepository.findById(alice.id!!)).thenReturn(Optional.of(alice))

        service.joinViaInvite("tok")

        val captor = ArgumentCaptor.forClass(TripEntity::class.java)
        verify(tripRepository).save(captor.capture())
        assertTrue(captor.value.participants.any { it.id == alice.id })
        verify(notificationService).notifyParticipantJoined(any(), any())
    }

    @Test
    fun `joinViaInvite is idempotent for an existing participant`() {
        val trip = trip(participants = mutableListOf(alice, bob), token = "tok")
        whenever(tripRepository.findByInviteToken("tok")).thenReturn(trip)

        service.joinViaInvite("tok")

        verify(tripRepository, never()).save(any<TripEntity>())
        verify(notificationService, never()).notifyParticipantJoined(any(), any())
    }

    @Test
    fun `joinViaInvite rejects a cancelled trip`() {
        val trip = trip(participants = mutableListOf(bob), token = "tok", status = TripStatus.CANCELLED)
        whenever(tripRepository.findByInviteToken("tok")).thenReturn(trip)

        assertThrows(ConflictException::class.java) { service.joinViaInvite("tok") }
        verify(tripRepository, never()).save(any<TripEntity>())
    }

    @Test
    fun `joinViaInvite throws NotFound for an unknown token`() {
        whenever(tripRepository.findByInviteToken("nope")).thenReturn(null)

        assertThrows(NotFoundException::class.java) { service.joinViaInvite("nope") }
    }

    // ---- helpers -----------------------------------------------------------

    private fun trip(
        participants: MutableList<UserEntity>,
        token: String?,
        createdBy: UserEntity? = null,
        status: TripStatus = TripStatus.PLANNED,
    ) = TripEntity(
        id = UUID.randomUUID(),
        name = "Trip",
        participants = participants,
        startTime = LocalDateTime.of(2026, 6, 1, 9, 0),
        endTime = LocalDateTime.of(2026, 6, 10, 9, 0),
        destination = "Sardinia",
        status = status,
        createdBy = createdBy,
        inviteToken = token,
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
