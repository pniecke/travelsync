package com.paullouis.travelsync.entity

import com.paullouis.travelsync.model.generated.Currency
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "expense")
data class ExpenseEntity(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    val amount: Double,

    @ManyToOne
    @JoinColumn(name = "trip_id")
    val trip: TripEntity,

    @ManyToOne
    @JoinColumn(name = "user_id")
    val user: UserEntity,

    @Enumerated(EnumType.STRING)
    val currency: Currency,

    @Column(updatable = false)
    val createdAt: LocalDateTime? = null,
    @Column(nullable = true)
    val updatedAt: LocalDateTime? = null
)
