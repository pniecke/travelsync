package com.paullouis.travelsync.model

import java.util.*

data class User(
    val id: UUID? = null,
    val password: String? = null,
    val username: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val mobile: String,
    val locale: Locale
)
