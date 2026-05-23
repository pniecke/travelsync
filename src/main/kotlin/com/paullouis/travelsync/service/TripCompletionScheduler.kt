package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.model.generated.TripStatus
import com.paullouis.travelsync.repository.TripRepository
import jakarta.transaction.Transactional
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.LocalDateTime

@Service
class TripCompletionScheduler(
    private val tripRepository: TripRepository,
) {

    private val logger = LoggerFactory.getLogger(TripCompletionScheduler::class.java)

    @Scheduled(cron = "0 0 * * * *")
    fun completeFinishedTrips() {
        val now = LocalDateTime.now()
        val due = tripRepository.findAllByStatusAndEndTimeIsNotNullAndEndTimeLessThanEqual(
            TripStatus.IN_PROGRESS,
            now,
        )
        if (due.isEmpty()) return

        logger.info("TripCompletionScheduler: completing ${due.size} finished trip(s)")
        due.forEach { trip ->
            try {
                completeTrip(trip)
            } catch (e: Exception) {
                logger.error("Failed to complete trip ${trip.id}", e)
            }
        }
    }

    @Transactional
    fun completeTrip(trip: TripEntity) {
        tripRepository.save(trip.copy(status = TripStatus.COMPLETED))
    }
}
