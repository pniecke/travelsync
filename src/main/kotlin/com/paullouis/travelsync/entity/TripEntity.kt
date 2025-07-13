package com.paullouis.travelsync.entity

import com.paullouis.travelsync.model.generated.TripStatus
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "trip")
data class TripEntity(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "UUID", nullable = false, updatable = false)
    val id: UUID? = null,
    val name: String,
    @ManyToMany
    @JoinTable(
        name = "trip_participants",
        joinColumns = [JoinColumn(name = "trip_id")],
        inverseJoinColumns = [JoinColumn(name = "user_id")]
    )
    val participants: List<UserEntity>,
    val startTime: LocalDateTime,
    val endTime: LocalDateTime,
    val destination: String,
    val description: String,
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    val status: TripStatus,

    @OneToMany(mappedBy =  "trip")
    val expenses: List<ExpenseEntity>? = null,

    @Column(updatable = false)
    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
    @Column(nullable = true)
    @UpdateTimestamp
    val updatedAt: LocalDateTime? = null
)
