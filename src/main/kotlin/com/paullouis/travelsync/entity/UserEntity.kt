package com.paullouis.travelsync.entity

import com.paullouis.travelsync.model.AuthProvider
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
data class UserEntity(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,
    val password: String? = null,
    val username: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val mobile: String,
    val locale: String,
    @ManyToMany(mappedBy = "participants")
    val trips: List<TripEntity>,
    @Enumerated(value = EnumType.STRING)
    val authProvider: AuthProvider,
    @Column(nullable = true)
    val externalId: String? = null,

    @Column(nullable = true, updatable = false)
    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
    @Column(nullable = true)
    @UpdateTimestamp
    val updatedAt: LocalDateTime? = null
)
