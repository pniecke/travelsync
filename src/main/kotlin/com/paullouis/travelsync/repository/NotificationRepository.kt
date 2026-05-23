package com.paullouis.travelsync.repository

import com.paullouis.travelsync.entity.NotificationEntity
import com.paullouis.travelsync.entity.UserEntity
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.CrudRepository
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface NotificationRepository : CrudRepository<NotificationEntity, UUID> {

    fun findAllByRecipientOrderByCreatedAtDesc(
        recipient: UserEntity,
        pageable: Pageable,
    ): List<NotificationEntity>

    fun findAllByRecipientAndReadFalseOrderByCreatedAtDesc(
        recipient: UserEntity,
        pageable: Pageable,
    ): List<NotificationEntity>

    fun countByRecipientAndReadFalse(recipient: UserEntity): Long

    @Modifying
    @Query(
        """
        update NotificationEntity n
        set n.read = true
        where n.recipient = :recipient and n.read = false
        """
    )
    fun markAllReadForRecipient(@Param("recipient") recipient: UserEntity): Int
}
