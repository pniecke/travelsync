package com.paullouis.travelsync.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime
import java.util.UUID

enum class NotificationType {
    EXPENSE_INVOLVING_YOU,
    ADDED_TO_TRIP,
    TRIP_STARTED,
    PARTICIPANT_JOINED,
}

@Entity
@Table(
    name = "notification",
    indexes = [
        Index(name = "idx_notification_recipient_created", columnList = "recipient_id, created_at"),
        Index(name = "idx_notification_recipient_read", columnList = "recipient_id, read"),
    ],
)
data class NotificationEntity(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "UUID", nullable = false, updatable = false)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    val recipient: UserEntity,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val type: NotificationType,

    @Column(name = "trip_id")
    val tripId: UUID? = null,

    @Column(name = "expense_id")
    val expenseId: UUID? = null,

    @Column(name = "actor_user_id")
    val actorUserId: UUID? = null,

    @Column(nullable = false, length = 200)
    val title: String,

    @Column(nullable = false, length = 1000)
    val message: String,

    @Column(nullable = false)
    val read: Boolean = false,

    @Column(updatable = false)
    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)
