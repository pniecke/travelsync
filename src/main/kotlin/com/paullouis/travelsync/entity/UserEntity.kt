package com.paullouis.travelsync.entity

import com.paullouis.travelsync.model.AuthProvider
import com.paullouis.travelsync.model.generated.UserRole
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "user_entity")
data class UserEntity(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,
    val password: String? = null,
    @Column(unique = true, nullable = false)
    val username: String,
    val firstName: String,
    val lastName: String,
    @Column(unique = true, nullable = false)
    val email: String,
    val mobile: String,
    val locale: Locale,
    val roles: Set<UserRole>,

    @ManyToMany(mappedBy = "participants")
    val trips: MutableList<TripEntity>? = null,
    @Enumerated(value = EnumType.STRING)
    val authProvider: AuthProvider? = null,
    @Column(nullable = true)
    val externalId: String? = null,

    @OneToMany(mappedBy = "createdBy")
    val expenses: MutableList<ExpenseEntity>? = null,

    @OneToMany(mappedBy = "paidBy")
    val paidExpenses: MutableList<ExpenseEntity>? = null,

    @Column(nullable = true, updatable = false)
    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
    @Column(nullable = true)
    @UpdateTimestamp
    val updatedAt: LocalDateTime? = null
)
