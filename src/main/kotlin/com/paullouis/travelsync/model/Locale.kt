package com.paullouis.travelsync.model

import jakarta.persistence.Embeddable

@Embeddable
enum class Locale {
    ENGLISH,
    GERMAN
}