package com.paullouis.travelsync.utils.mapper

import com.paullouis.travelsync.entity.NotificationEntity
import com.paullouis.travelsync.model.generated.Notification
import org.mapstruct.Mapper

@Mapper(componentModel = "spring")
interface NotificationMapper {

    fun toDto(notificationEntity: NotificationEntity): Notification
}
