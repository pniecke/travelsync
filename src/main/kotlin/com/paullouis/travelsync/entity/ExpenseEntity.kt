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

    var description: String? = null,

    var amount: Double,

    @ManyToOne
    @JoinColumn(name = "trip_id")
    val trip: TripEntity,

    @ManyToOne
    @JoinColumn(name = "created_by")
    val createdBy: UserEntity,

    @Enumerated(EnumType.STRING)
    var currency: Currency,

    @ManyToOne
    @JoinColumn(name = "paid_by", nullable = true)
    var paidBy: UserEntity? = null,

    @OneToMany(mappedBy = "expense", cascade = [CascadeType.ALL], orphanRemoval = true)
    val shares: MutableList<ExpenseShareEntity> = mutableListOf(),

    @Column(nullable = false)
    var dateOfExpense: LocalDateTime,

    // Receipt attachment. The file bytes live on disk (see ReceiptStorageService);
    // only the original filename and content type are persisted here so the API
    // can advertise a receipt exists and serve it with the right Content-Type.
    @Column(nullable = true)
    var receiptFilename: String? = null,

    @Column(nullable = true)
    var receiptContentType: String? = null,

    @Column(updatable = false)
    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
    @Column(nullable = true)
    @UpdateTimestamp
    val updatedAt: LocalDateTime? = null
)
