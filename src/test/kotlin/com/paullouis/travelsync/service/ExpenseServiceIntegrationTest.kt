package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.ExpenseEntity
import com.paullouis.travelsync.entity.ExpenseShareEntity
import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.AuthProvider
import com.paullouis.travelsync.model.generated.Currency
import com.paullouis.travelsync.model.generated.Expense
import com.paullouis.travelsync.model.generated.ExpenseShare
import com.paullouis.travelsync.model.generated.ExpenseShareType
import com.paullouis.travelsync.model.generated.TripStatus
import com.paullouis.travelsync.model.generated.User
import com.paullouis.travelsync.model.generated.UserRole
import com.paullouis.travelsync.repository.ExpenseRepository
import com.paullouis.travelsync.repository.ExpenseShareRepository
import com.paullouis.travelsync.service.exception.ForbiddenException
import com.paullouis.travelsync.utils.mapper.ExpenseMapperImpl
import com.paullouis.travelsync.utils.mapper.ExpenseShareMapperImpl
import com.paullouis.travelsync.utils.mapper.UserMapperImpl
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import com.paullouis.travelsync.service.exception.NotFoundException
import java.nio.file.Files
import java.time.LocalDateTime
import java.util.Locale
import java.util.UUID

/**
 * Exercises ExpenseService.update() and the receipt methods against a real H2
 * database. The lazy-collection refresh in update() only behaves correctly with
 * a genuine persistence context, so the pure mock test cannot cover it — this is
 * the regression guard for the "PUT returns empty shares" bug.
 *
 * Only the current-user resolution and notifications are mocked; the real
 * mappers, repositories and on-disk receipt storage are wired in.
 */
@DataJpaTest
@Import(
    ExpenseService::class,
    ExpenseMapperImpl::class,
    ExpenseShareMapperImpl::class,
    UserMapperImpl::class,
    ExpenseServiceIntegrationTest.TestBeans::class,
)
class ExpenseServiceIntegrationTest {

    @TestConfiguration
    class TestBeans {
        @Bean
        fun userService(): UserService = mock()

        @Bean
        fun notificationService(): INotificationService = mock()

        @Bean
        fun receiptStorage(): ReceiptStorageService =
            ReceiptStorageService(Files.createTempDirectory("ts-receipts-it").toString())
    }

    @Autowired private lateinit var em: TestEntityManager
    @Autowired private lateinit var service: ExpenseService
    @Autowired private lateinit var expenseRepository: ExpenseRepository
    @Autowired private lateinit var expenseShareRepository: ExpenseShareRepository
    @Autowired private lateinit var userService: UserService

    private lateinit var alice: UserEntity
    private lateinit var bob: UserEntity
    private lateinit var trip: TripEntity
    private lateinit var expense: ExpenseEntity

    @BeforeEach
    fun setUp() {
        alice = persistUser("alice")
        bob = persistUser("bob")
        trip = em.persist(
            TripEntity(
                name = "Trip",
                participants = mutableListOf(alice, bob),
                startTime = LocalDateTime.of(2026, 6, 1, 9, 0),
                destination = "Sardinia",
                status = TripStatus.PLANNED,
                createdBy = alice,
            ),
        )
        expense = ExpenseEntity(
            description = "Dinner",
            amount = 120.0,
            trip = trip,
            createdBy = alice,
            currency = Currency.EUR,
            paidBy = alice,
            dateOfExpense = LocalDateTime.of(2026, 6, 2, 20, 0),
        ).apply {
            shares.add(shareEntity(this, alice, 60.0))
            shares.add(shareEntity(this, bob, 60.0))
        }
        expense = em.persist(expense)
        em.flush()
        em.clear()
        currentUser(alice)
    }

    @Test
    fun `update returns the new split and persists it, replacing old shares`() {
        val dto = Expense(
            amount = 200.0,
            currency = Currency.EUR,
            dateOfExpense = LocalDateTime.of(2026, 6, 2, 20, 0),
            createdBy = User(id = alice.id, username = "alice"),
            tripId = trip.id!!,
            id = expense.id,
            description = "Dinner (2 nights)",
            paidBy = User(id = bob.id, username = "bob"),
            shares = listOf(
                ExpenseShare(User(id = alice.id, username = "alice"), 100.0, ExpenseShareType.PERCENT, shareValue = 50.0),
                ExpenseShare(User(id = bob.id, username = "bob"), 100.0, ExpenseShareType.PERCENT, shareValue = 50.0),
            ),
        )

        val result = service.update(expense.id!!, dto)

        // Returned DTO reflects the change (regression: shares were empty here).
        assertEquals(200.0, result.amount)
        assertEquals("Dinner (2 nights)", result.description)
        assertEquals(bob.id, result.paidBy?.id)
        assertEquals(2, result.shares?.size)
        assertEquals(200.0, result.shares!!.sumOf { it.amount }, 0.001)
        assertEquals(ExpenseShareType.PERCENT, result.shares!!.first().shareType)
        assertEquals(50.0, result.shares!!.first().shareValue)

        // Persisted state: exactly two shares, old ones gone.
        em.flush()
        em.clear()
        val reloaded = expenseRepository.findById(expense.id!!).orElseThrow()
        assertEquals(200.0, reloaded.amount)
        assertEquals(bob.id, reloaded.paidBy?.id)
        assertEquals(2, reloaded.shares.size)
        assertEquals(200.0, reloaded.shares.sumOf { it.amount }, 0.001)
        assertEquals(2, expenseShareRepository.findAllByExpense(reloaded).size)
    }

    @Test
    fun `update is forbidden for a participant who is not the creator`() {
        currentUser(bob)
        val dto = Expense(
            amount = 120.0,
            currency = Currency.EUR,
            dateOfExpense = LocalDateTime.of(2026, 6, 2, 20, 0),
            createdBy = User(id = alice.id, username = "alice"),
            tripId = trip.id!!,
            id = expense.id,
            shares = listOf(ExpenseShare(User(id = alice.id, username = "alice"), 120.0, ExpenseShareType.EQUAL)),
        )
        assertThrows(ForbiddenException::class.java) { service.update(expense.id!!, dto) }
    }

    @Test
    fun `update rejects a split that does not sum to the amount`() {
        val dto = Expense(
            amount = 200.0,
            currency = Currency.EUR,
            dateOfExpense = LocalDateTime.of(2026, 6, 2, 20, 0),
            createdBy = User(id = alice.id, username = "alice"),
            tripId = trip.id!!,
            id = expense.id,
            shares = listOf(ExpenseShare(User(id = alice.id, username = "alice"), 50.0, ExpenseShareType.EXACT)),
        )
        assertThrows(IllegalArgumentException::class.java) { service.update(expense.id!!, dto) }
    }

    @Test
    fun `attach then remove receipt round-trips through the database and storage`() {
        val bytes = "receipt-bytes".toByteArray()

        val afterAttach = service.attachReceipt(expense.id!!, "hotel.png", "image/png", bytes)
        assertEquals("hotel.png", afterAttach.receiptFilename)

        em.flush(); em.clear()
        val reloaded = expenseRepository.findById(expense.id!!).orElseThrow()
        assertEquals("hotel.png", reloaded.receiptFilename)
        assertEquals("image/png", reloaded.receiptContentType)

        val download = service.getReceipt(expense.id!!)
        assertEquals("hotel.png", download.filename)
        assertEquals("image/png", download.contentType)
        assertNotNull(download.resource)

        val afterRemove = service.removeReceipt(expense.id!!)
        assertNull(afterRemove.receiptFilename)

        em.flush(); em.clear()
        assertNull(expenseRepository.findById(expense.id!!).orElseThrow().receiptFilename)
        // File is gone too.
        assertThrows(NotFoundException::class.java) { service.getReceipt(expense.id!!) }
    }

    // ---------- helpers ----------

    private fun currentUser(user: UserEntity) {
        // Must carry every field the real UserMapper.toEntity needs to build a
        // (non-null) UserEntity, since update() resolves the current user that way.
        whenever(userService.getOrCreateUser()).thenReturn(
            User(
                id = user.id,
                username = user.username,
                firstName = user.firstName,
                lastName = user.lastName,
                email = user.email,
                mobile = "",
                locale = "en",
                roles = listOf(UserRole.USER),
            ),
        )
    }

    private fun persistUser(username: String): UserEntity = em.persist(
        UserEntity(
            username = username,
            password = null,
            firstName = username.replaceFirstChar { it.uppercase() },
            lastName = "Last",
            email = "$username@example.com",
            mobile = "",
            locale = Locale.ENGLISH,
            roles = setOf(UserRole.USER),
            authProvider = AuthProvider.DATABASE,
        ),
    )

    private fun shareEntity(expense: ExpenseEntity, user: UserEntity, amount: Double) = ExpenseShareEntity(
        expense = expense,
        user = user,
        amount = amount,
        shareType = ExpenseShareType.EQUAL,
        shareValue = null,
    )
}
