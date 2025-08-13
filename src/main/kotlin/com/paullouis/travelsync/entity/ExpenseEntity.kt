package com.paullouis.travelsync.entity

import com.paullouis.travelsync.model.generated.Currency
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "expense")
data class ExpenseEntity(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    val description: String? = null,

    val amount: Double,

    @ManyToOne
    @JoinColumn(name = "trip_id")
    val trip: TripEntity,

    @ManyToOne
    @JoinColumn(name = "created_by")
    val createdBy: UserEntity,

    @Enumerated(EnumType.STRING)
    val currency: Currency,

    @ManyToOne
    @JoinColumn(name = "paid_by", nullable = true)
    val paidBy: UserEntity? = null,

    @Column(nullable = false)
    val date: LocalDateTime,

    @Column(updatable = false)
    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
    @Column(nullable = true)
    @UpdateTimestamp
    val updatedAt: LocalDateTime? = null
)
