package com.paullouis.travelsync.model

import lombok.Builder
import java.time.LocalDateTime
import java.util.*

@Builder
data class Trip(
    val id: UUID? = null,
    val name: String,
    val participants: List<User>,
    val startTime: LocalDateTime,
    val endTime: LocalDateTime,
    val destination: String,
    val description: String,
    val status: TripStatus,
    val expenses: String,
)
