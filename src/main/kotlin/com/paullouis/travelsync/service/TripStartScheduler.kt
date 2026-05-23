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
class TripStartScheduler(
    private val tripRepository: TripRepository,
    private val notificationService: INotificationService,
) {

    private val logger = LoggerFactory.getLogger(TripStartScheduler::class.java)

    @Scheduled(cron = "0 0 * * * *")
    fun startDueTrips() {
        val now = LocalDateTime.now()
        val due = tripRepository.findAllByStatusAndStartTimeLessThanEqual(TripStatus.PLANNED, now)
        if (due.isEmpty()) return

        logger.info("TripStartScheduler: starting ${due.size} due trip(s)")
        due.forEach { trip ->
            try {
                startTrip(trip)
            } catch (e: Exception) {
                logger.error("Failed to start trip ${trip.id}", e)
            }
        }
    }

    @Transactional
    fun startTrip(trip: TripEntity) {
        val updated = tripRepository.save(trip.copy(status = TripStatus.IN_PROGRESS))
        notificationService.notifyTripStarted(updated)
    }
}
