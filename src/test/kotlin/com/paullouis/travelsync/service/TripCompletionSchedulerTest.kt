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

class TripCompletionSchedulerTest {

    private val tripRepository: TripRepository = mock()

    private lateinit var scheduler: TripCompletionScheduler

    @BeforeEach
    fun setUp() {
        scheduler = TripCompletionScheduler(tripRepository)
        whenever(tripRepository.save(any<TripEntity>())).thenAnswer { it.arguments[0] }
    }

    @Test
    fun `completeFinishedTrips flips status to COMPLETED for trip whose endTime has passed`() {
        val trip = TripEntity(
            id = UUID.randomUUID(),
            name = "Finished trip",
            participants = mutableListOf(userEntity("alice")),
            startTime = LocalDateTime.now().minusDays(7),
            endTime = LocalDateTime.now().minusHours(1),
            destination = "Italy",
            status = TripStatus.IN_PROGRESS,
        )
        whenever(
            tripRepository.findAllByStatusAndEndTimeIsNotNullAndEndTimeLessThanEqual(
                eq(TripStatus.IN_PROGRESS),
                any(),
            )
        ).thenReturn(listOf(trip))

        scheduler.completeFinishedTrips()

        val captor = ArgumentCaptor.forClass(TripEntity::class.java)
        verify(tripRepository).save(captor.capture())
        assertEquals(TripStatus.COMPLETED, captor.value.status)
    }

    @Test
    fun `completeFinishedTrips is a no-op when nothing is due`() {
        whenever(
            tripRepository.findAllByStatusAndEndTimeIsNotNullAndEndTimeLessThanEqual(any(), any())
        ).thenReturn(emptyList())

        scheduler.completeFinishedTrips()

        verify(tripRepository, never()).save(any<TripEntity>())
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
