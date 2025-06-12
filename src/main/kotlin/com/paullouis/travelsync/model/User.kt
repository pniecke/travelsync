package com.paullouis.travelsync.model

import java.time.LocalDateTime
import java.util.UUID

data class User(
    val id: UUID,
    val password: String,
    val username: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val mobile: String,
    val locale: Locale,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)
