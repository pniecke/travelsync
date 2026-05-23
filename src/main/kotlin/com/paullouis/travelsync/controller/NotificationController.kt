package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.generated.Notification
import com.paullouis.travelsync.model.generated.NotificationList
import com.paullouis.travelsync.service.INotificationService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class NotificationController(
    private val notificationService: INotificationService,
) : NotificationApi {

    override fun getNotifications(
        unreadOnly: Boolean,
        limit: Int,
    ): ResponseEntity<NotificationList> =
        ResponseEntity.ok(notificationService.listForCurrentUser(unreadOnly, limit))

    override fun markNotificationRead(@PathVariable id: UUID): ResponseEntity<Notification> =
        ResponseEntity.ok(notificationService.markRead(id))

    override fun markAllNotificationsRead(): ResponseEntity<Unit> {
        notificationService.markAllRead()
        return ResponseEntity.noContent().build()
    }
}
