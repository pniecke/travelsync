package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.ExpenseEntity
import com.paullouis.travelsync.entity.NotificationEntity
import com.paullouis.travelsync.entity.NotificationType
import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.generated.Notification
import com.paullouis.travelsync.model.generated.NotificationList
import com.paullouis.travelsync.repository.NotificationRepository
import com.paullouis.travelsync.service.exception.ForbiddenException
import com.paullouis.travelsync.service.exception.NotFoundException
import com.paullouis.travelsync.utils.mapper.NotificationMapper
import com.paullouis.travelsync.utils.mapper.UserMapper
import jakarta.transaction.Transactional
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class NotificationService(
    private val notificationRepository: NotificationRepository,
    private val notificationMapper: NotificationMapper,
    private val userService: UserService,
    private val userMapper: UserMapper,
) : INotificationService {

    override fun listForCurrentUser(unreadOnly: Boolean, limit: Int): NotificationList {
        val recipient = currentUserEntity()
        val capped = limit.coerceIn(1, 200)
        val page = PageRequest.of(0, capped)
        val rows = if (unreadOnly) {
            notificationRepository.findAllByRecipientAndReadFalseOrderByCreatedAtDesc(recipient, page)
        } else {
            notificationRepository.findAllByRecipientOrderByCreatedAtDesc(recipient, page)
        }
        return NotificationList(
            items = rows.map(notificationMapper::toDto),
            unreadCount = notificationRepository.countByRecipientAndReadFalse(recipient),
        )
    }

    @Transactional
    override fun markRead(id: UUID): Notification {
        val notification = notificationRepository.findById(id)
            .orElseThrow { NotFoundException("Notification $id not found") }
        val current = currentUserEntity()
        if (notification.recipient.id != current.id) {
            throw ForbiddenException("You cannot read another user's notification")
        }
        val updated = if (notification.read) {
            notification
        } else {
            notificationRepository.save(notification.copy(read = true))
        }
        return notificationMapper.toDto(updated)
    }

    @Transactional
    override fun markAllRead() {
        notificationRepository.markAllReadForRecipient(currentUserEntity())
    }

    @Transactional
    override fun notifyExpenseInvolvingYou(expense: ExpenseEntity, actor: UserEntity) {
        val recipients = buildSet {
            expense.shares.forEach { add(it.user) }
            expense.paidBy?.let(::add)
        }.filter { it.id != null && it.id != actor.id }
            .distinctBy { it.id }

        if (recipients.isEmpty()) return

        val title = "New expense"
        val actorName = displayName(actor)
        val tripName = expense.trip.name ?: expense.trip.destination
        val description = expense.description?.takeIf { it.isNotBlank() } ?: "an expense"
        val amount = "%.2f %s".format(expense.amount, expense.currency.name)
        val message = "$actorName added $description ($amount) in $tripName"

        notificationRepository.saveAll(
            recipients.map { recipient ->
                NotificationEntity(
                    recipient = recipient,
                    type = NotificationType.EXPENSE_INVOLVING_YOU,
                    tripId = expense.trip.id,
                    expenseId = expense.id,
                    actorUserId = actor.id,
                    title = title,
                    message = message,
                )
            }
        )
    }

    @Transactional
    override fun notifyAddedToTrip(
        trip: TripEntity,
        newParticipants: Collection<UserEntity>,
        actor: UserEntity,
    ) {
        val recipients = newParticipants
            .filter { it.id != null && it.id != actor.id }
            .distinctBy { it.id }

        if (recipients.isEmpty()) return

        val actorName = displayName(actor)
        val tripName = trip.name ?: trip.destination
        val title = "Added to a trip"
        val message = "$actorName added you to $tripName"

        notificationRepository.saveAll(
            recipients.map { recipient ->
                NotificationEntity(
                    recipient = recipient,
                    type = NotificationType.ADDED_TO_TRIP,
                    tripId = trip.id,
                    actorUserId = actor.id,
                    title = title,
                    message = message,
                )
            }
        )
    }

    @Transactional
    override fun notifyTripStarted(trip: TripEntity) {
        val recipients = trip.participants.filter { it.id != null }.distinctBy { it.id }
        if (recipients.isEmpty()) return

        val tripName = trip.name ?: trip.destination
        val title = "Trip started"
        val message = "Your trip $tripName has started — have fun!"

        notificationRepository.saveAll(
            recipients.map { recipient ->
                NotificationEntity(
                    recipient = recipient,
                    type = NotificationType.TRIP_STARTED,
                    tripId = trip.id,
                    title = title,
                    message = message,
                )
            }
        )
    }

    private fun currentUserEntity(): UserEntity =
        userMapper.toEntity(userService.getOrCreateUser())

    private fun displayName(user: UserEntity): String {
        val first = user.firstName?.trim().orEmpty()
        val last = user.lastName?.trim().orEmpty()
        val full = listOf(first, last).filter { it.isNotEmpty() }.joinToString(" ")
        return full.ifEmpty { user.username }
    }
}
