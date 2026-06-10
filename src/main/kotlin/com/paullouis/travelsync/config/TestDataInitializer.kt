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