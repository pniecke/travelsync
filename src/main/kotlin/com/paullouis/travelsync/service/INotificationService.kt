package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.ExpenseEntity
import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.generated.Notification
import com.paullouis.travelsync.model.generated.NotificationList
import java.util.UUID

interface INotificationService {

    fun listForCurrentUser(unreadOnly: Boolean = false, limit: Int = 50): NotificationList

    fun markRead(id: UUID): Notification

    fun markAllRead()

    fun notifyExpenseInvolvingYou(expense: ExpenseEntity, actor: UserEntity)

    fun notifyAddedToTrip(trip: TripEntity, newParticipants: Collection<UserEntity>, actor: UserEntity)

    fun notifyTripStarted(trip: TripEntity)
}
