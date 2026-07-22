package com.paullouis.travelsync.config

import com.paullouis.travelsync.entity.ExpenseEntity
import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.AuthProvider
import com.paullouis.travelsync.model.generated.Currency
import com.paullouis.travelsync.model.generated.TripStatus
import com.paullouis.travelsync.model.generated.UserRole
import com.paullouis.travelsync.repository.ExpenseRepository
import com.paullouis.travelsync.repository.TripRepository
import com.paullouis.travelsync.repository.UserRepository
import jakarta.annotation.PostConstruct
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component
import java.time.LocalDateTime
import java.util.*

@Component
class TestDataInitializer(
    private val userRepository: UserRepository,
    private val tripRepository: TripRepository,
    private val expenseRepository: ExpenseRepository,
    private val passwordEncoder: PasswordEncoder,
) {
    @PostConstruct
    fun init() {
        var user1 = getUser1()
        var user2 = getUser2()
        var user3 = getUser3()
        if (userRepository.count() == 0L) {
            user1 = userRepository.save(user1)
            user2 = userRepository.save(user2)
            user3 = userRepository.save(user3)
        } else {
            user1 = userRepository.findByUsername("mausi") ?: user1
            user2 = userRepository.findByUsername("admin") ?: user2
            user3 = userRepository.findByUsername("paul") ?: userRepository.save(user3)
        }

        val trip1 = getTrip1(mutableListOf(user1, user2), user1)
        if (tripRepository.count() == 0L) {
            tripRepository.save(
                trip1
            )
            // paul = user3, lili = user1 (mausi)
            tripRepository.saveAll(getPaulAndLiliTrips(paul = user3, lili = user1))
        }

        var expense1 = getExpense("Ferry to Sardinia", 400.0, trip1, user1, user2)
        val expense2 = getExpense("AirBnB", 4000.0, trip1, user2, null)
        if (expenseRepository.count() == 0L) {
            expense1 = expenseRepository.save(expense1)
            expenseRepository.save(expense2)
        } else {
            expense1 = expenseRepository.findById(
                expense1.id
                    ?: UUID.randomUUID()
            ).orElse(expense1)
            expenseRepository.findById(
                expense2.id
                    ?: UUID.randomUUID()
            ).orElse(expense2)
        }

        user1.trips?.add(trip1)
        userRepository.save(user1)

        user1.expenses?.add(expense1)
        userRepository.save(user1)

        trip1.expenses?.add(expense1)
        tripRepository.save(trip1)
    }

    private fun getUser1(): UserEntity {
        return UserEntity(
            password = passwordEncoder.encode("mausi"),
            email = "mausi@bla.com",
            username = "mausi",
            firstName = "Lili Jeanne",
            lastName = "Bösiger",
            mobile = "0612345678",
            locale = Locale.GERMAN,
            trips = mutableListOf(),
            authProvider = AuthProvider.DATABASE,
            externalId = null,
            expenses = mutableListOf(),
            paidExpenses = mutableListOf(),
            roles = setOf(UserRole.USER)
        )
    }

    private fun getUser2(): UserEntity {
        return UserEntity(
            password = passwordEncoder.encode("admin"),
            email = "admin@bla.com",
            username = "admin",
            firstName = "admin",
            lastName = "admin",
            mobile = "0612345678",
            locale = Locale.US,
            trips = mutableListOf(),
            authProvider = AuthProvider.DATABASE,
            externalId = null,
            expenses = mutableListOf(),
            paidExpenses = mutableListOf(),
            roles = setOf(UserRole.ADMIN)
        )
    }

    private fun getUser3(): UserEntity {
        return UserEntity(
            password = passwordEncoder.encode("paul"),
            email = "paul@bla.com",
            username = "paul",
            firstName = "Paul",
            lastName = "Niecke",
            mobile = "0612345678",
            locale = Locale.GERMAN,
            trips = mutableListOf(),
            authProvider = AuthProvider.DATABASE,
            externalId = null,
            expenses = mutableListOf(),
            paidExpenses = mutableListOf(),
            roles = setOf(UserRole.USER)
        )
    }

    private fun getTrip1(participants: MutableList<UserEntity>, creator: UserEntity): TripEntity {
        return TripEntity(
            name = "Mausi's Summer Vacation",
            description = "A vacation to Sardinia with mausi and mausi",
            destination = "Sardinia, Italy",
            participants = participants,
            startTime = LocalDateTime.of(2025, 7, 5, 11, 0),
            endTime = LocalDateTime.of(2025, 7, 15, 11, 0),
            expenses = mutableListOf(),
            status = TripStatus.COMPLETED,
            createdBy = creator,
        )
    }

    /**
     * Trips involving paul and lili. paul creates and joins every trip; lili joins
     * all except the paul-only trips (Valencia, San Marino, Split, Ibiza, Barcelona,
     * Berlin). Statuses reflect the trip dates relative to the seeding date.
     */
    private fun getPaulAndLiliTrips(paul: UserEntity, lili: UserEntity): List<TripEntity> {
        fun both() = mutableListOf(paul, lili)
        fun paulOnly() = mutableListOf(paul)
        return listOf(
            trip(
                "Teneriffa", "Tenerife, Spain",
                LocalDateTime.of(2026, 7, 17, 10, 0), LocalDateTime.of(2026, 7, 26, 18, 0),
                TripStatus.IN_PROGRESS, both(), paul,
            ),
            trip(
                "Nizza", "Nice, France",
                LocalDateTime.of(2026, 4, 5, 10, 0), LocalDateTime.of(2026, 4, 9, 18, 0),
                TripStatus.COMPLETED, both(), paul,
            ),
            trip(
                "VFB Stuttgart - HSV", "Stuttgart, Germany",
                LocalDateTime.of(2026, 4, 12, 15, 30), null,
                TripStatus.COMPLETED, both(), paul,
            ),
            trip(
                "Mailand", "Milan, Italy",
                LocalDateTime.of(2026, 2, 13, 10, 0), LocalDateTime.of(2026, 2, 15, 18, 0),
                TripStatus.COMPLETED, both(), paul,
            ),
            trip(
                "Valencia", "Valencia, Spain",
                LocalDateTime.of(2025, 10, 22, 10, 0), LocalDateTime.of(2025, 10, 25, 18, 0),
                TripStatus.COMPLETED, paulOnly(), paul,
            ),
            trip(
                "San Marino Moto GP", "San Marino",
                LocalDateTime.of(2025, 9, 11, 10, 0), LocalDateTime.of(2025, 9, 14, 18, 0),
                TripStatus.COMPLETED, paulOnly(), paul,
            ),
            trip(
                "Split", "Split, Croatia",
                LocalDateTime.of(2025, 8, 27, 10, 0), LocalDateTime.of(2025, 9, 2, 18, 0),
                TripStatus.COMPLETED, paulOnly(), paul,
            ),
            trip(
                "Hamburg", "Hamburg, Germany",
                LocalDateTime.of(2025, 8, 6, 10, 0), LocalDateTime.of(2025, 8, 11, 18, 0),
                TripStatus.COMPLETED, both(), paul,
            ),
            trip(
                "Ibiza", "Ibiza, Spain",
                LocalDateTime.of(2025, 7, 23, 10, 0), LocalDateTime.of(2025, 7, 28, 18, 0),
                TripStatus.COMPLETED, paulOnly(), paul,
            ),
            trip(
                "Sardinien", "Sardinia, Italy",
                LocalDateTime.of(2025, 7, 5, 10, 0), LocalDateTime.of(2025, 7, 14, 18, 0),
                TripStatus.COMPLETED, both(), paul,
            ),
            trip(
                "Barcelona", "Barcelona, Spain",
                LocalDateTime.of(2025, 5, 23, 10, 0), LocalDateTime.of(2025, 5, 28, 18, 0),
                TripStatus.COMPLETED, paulOnly(), paul,
            ),
            trip(
                "Berlin", "Berlin, Germany",
                LocalDateTime.of(2025, 4, 11, 10, 0), LocalDateTime.of(2025, 4, 15, 18, 0),
                TripStatus.COMPLETED, paulOnly(), paul,
            ),
            trip(
                "Domodossola", "Domodossola, Italy",
                LocalDateTime.of(2025, 2, 28, 10, 0), LocalDateTime.of(2025, 3, 2, 18, 0),
                TripStatus.COMPLETED, both(), paul,
            ),
        )
    }

    private fun trip(
        name: String,
        destination: String,
        start: LocalDateTime,
        end: LocalDateTime?,
        status: TripStatus,
        participants: MutableList<UserEntity>,
        creator: UserEntity,
    ): TripEntity = TripEntity(
        name = name,
        destination = destination,
        startTime = start,
        endTime = end,
        status = status,
        participants = participants,
        expenses = mutableListOf(),
        createdBy = creator,
    )

    private fun getExpense(
        description: String,
        amount: Double,
        trip: TripEntity,
        createdBy: UserEntity,
        paidBy: UserEntity?
    ): ExpenseEntity {
        return ExpenseEntity(
            description = description,
            amount = amount,
            trip = trip,
            currency = Currency.CHF,
            createdBy = createdBy,
            paidBy = paidBy,
            dateOfExpense = LocalDateTime.now()
        )
    }
}