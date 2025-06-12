package com.paullouis.travelsync.entity

import com.paullouis.travelsync.model.Locale
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.ManyToMany
import java.time.LocalDateTime
import java.util.UUID

@Entity
data class UserEntity(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID,
    val password: String,
    val username: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val mobile: String,
    @Enumerated(value = EnumType.STRING)
    val locale: Locale,
    @ManyToMany(mappedBy = "participants")
    val trips: List<TripEntity>,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)
