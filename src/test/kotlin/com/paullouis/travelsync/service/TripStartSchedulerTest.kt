package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.AuthProvider
import com.paullouis.travelsync.model.generated.TripStatus
import com.paullouis.travelsync.model.generated.UserRole
import com.paullouis.travelsync.repository.TripRepository
import org.junit.jupiter.api.Assertions.assertEquals
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
import java.util.UUID

class TripStartSchedulerTest {

    private val tripRepository: TripRepository = mock()
    private val notificationService: INotificationService = mock()

    private lateinit var scheduler: TripStartScheduler

    @BeforeEach
    fun setUp() {
        scheduler = TripStartScheduler(tripRepository, notificationService)
        whenever(tripRepository.save(any<TripEntity>())).thenAnswer { it.arguments[0] }
    }

    @Test
    fun `startDueTrips flips status and notifies participants for due trip`() {
        val user = userEntity("alice")
        val trip = TripEntity(
            id = UUID.randomUUID(),
            name = "Past trip",
            participants = mutableListOf(user),
            startTime = LocalDateTime.now().minusHours(1),
            destination = "Italy",
            status = TripStatus.PLANNED,
        )
        whenever(tripRepository.findAllByStatusAndStartTimeLessThanEqual(eq(TripStatus.PLANNED), any()))
            .thenReturn(listOf(trip))

        scheduler.startDueTrips()

        val captor = ArgumentCaptor.forClass(TripEntity::class.java)
        verify(tripRepository).save(captor.capture())
        assertEquals(TripStatus.IN_PROGRESS, captor.value.status)
        verify(notificationService).notifyTripStarted(any())
    }

    @Test
    fun `startDueTrips is a no-op when nothing is due`() {
        whenever(tripRepository.findAllByStatusAndStartTimeLessThanEqual(any(), any()))
            .thenReturn(emptyList())

        scheduler.startDueTrips()

        verify(tripRepository, never()).save(any<TripEntity>())
        verify(notificationService, never()).notifyTripStarted(any())
    }

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
