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
import com.paullouis.travelsync.repository.TripRepository
import com.paullouis.travelsync.repository.UserRepository
import com.paullouis.travelsync.service.exception.ForbiddenException
import com.paullouis.travelsync.service.exception.NotFoundException
import com.paullouis.travelsync.utils.mapper.ExpenseMapper
import com.paullouis.travelsync.utils.mapper.ExpenseShareMapper
import com.paullouis.travelsync.utils.mapper.UserMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.core.io.ByteArrayResource
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.time.LocalDateTime
import java.util.Locale
import java.util.Optional
import java.util.UUID

/**
 * Unit tests for the expense-edit and receipt logic added with the expense
 * detail feature. Repositories and storage are mocked; the real persistence
 * behaviour of update()/attachReceipt() is exercised against H2 in
 * [ExpenseServiceIntegrationTest].
 */
class ExpenseServiceTest {

    private val expenseMapper: ExpenseMapper = mock()
    private val expenseShareMapper: ExpenseShareMapper = mock()
    private val expenseRepository: ExpenseRepository = mock()
    private val expenseShareRepository: ExpenseShareRepository = mock()
    private val tripRepository: TripRepository = mock()
    private val userRepository: UserRepository = mock()
    private val userService: UserService = mock()
    private val userMapper: UserMapper = mock()
    private val notificationService: INotificationService = mock()
    private val receiptStorage: ReceiptStorageService = mock()

    private lateinit var service: ExpenseService

    private val aliceId = UUID.randomUUID()
    private val bobId = UUID.randomUUID()
    private val carolId = UUID.randomUUID()
    private val expenseId = UUID.randomUUID()

    private val alice = userEntity(aliceId, "alice")
    private val bob = userEntity(bobId, "bob")
    private val carol = userEntity(carolId, "carol")

    // Trip with alice (creator) and bob; carol is NOT a participant.
    private val trip = TripEntity(
        id = UUID.randomUUID(),
        name = "Trip",
        participants = mutableListOf(alice, bob),
        startTime = LocalDateTime.now(),
        destination = "Anywhere",
        status = TripStatus.PLANNED,
    )

    @BeforeEach
    fun setUp() {
        service = ExpenseService(
            expenseMapper,
            expenseShareMapper,
            expenseRepository,
            expenseShareRepository,
            tripRepository,
            userRepository,
            userService,
            userMapper,
            notificationService,
            receiptStorage,
        )
        // Default current user: alice (the creator).
        beCurrentUser(alice)
        // Payers resolve to real participants by default; the "payer missing"
        // test uses an id that is left unstubbed (-> empty).
        whenever(userRepository.findById(aliceId)).thenReturn(Optional.of(alice))
        whenever(userRepository.findById(bobId)).thenReturn(Optional.of(bob))
        // save()/saveAll() echo their arguments back.
        whenever(expenseRepository.save(any<ExpenseEntity>())).thenAnswer { it.arguments[0] }
        whenever(expenseShareRepository.saveAll(any<List<ExpenseShareEntity>>()))
            .thenAnswer { it.getArgument<List<ExpenseShareEntity>>(0).toMutableList() }
        // Map the (mutated) entity into a DTO so assertions can read it back.
        whenever(expenseMapper.toDto(any())).thenAnswer { inv ->
            val e = inv.getArgument<ExpenseEntity>(0)
            Expense(
                amount = e.amount,
                currency = e.currency,
                dateOfExpense = e.dateOfExpense,
                createdBy = userDto(e.createdBy),
                tripId = e.trip.id!!,
                id = e.id,
                description = e.description,
                paidBy = e.paidBy?.let(::userDto),
                shares = e.shares.map { ExpenseShare(userDto(it.user), it.amount, it.shareType, it.id, it.shareValue) },
                receiptFilename = e.receiptFilename,
            )
        }
    }

    // ---------- update() ----------

    @Test
    fun `update throws NotFound when the expense does not exist`() {
        whenever(expenseRepository.findById(expenseId)).thenReturn(Optional.empty())
        assertThrows(NotFoundException::class.java) {
            service.update(expenseId, updateDto(amount = 100.0, shares = equalShares(100.0)))
        }
    }

    @Test
    fun `update is forbidden for a participant who is not the creator`() {
        givenExistingExpense()
        beCurrentUser(bob) // participant, but alice created the expense
        assertThrows(ForbiddenException::class.java) {
            service.update(expenseId, updateDto(amount = 100.0, shares = equalShares(100.0)))
        }
        verify(expenseShareRepository, never()).deleteAllByExpense(any())
    }

    @Test
    fun `update is forbidden for a non-participant`() {
        givenExistingExpense()
        beCurrentUser(carol)
        assertThrows(ForbiddenException::class.java) {
            service.update(expenseId, updateDto(amount = 100.0, shares = equalShares(100.0)))
        }
    }

    @Test
    fun `update throws NotFound when the payer does not exist`() {
        givenExistingExpense()
        val ghost = UUID.randomUUID()
        whenever(userRepository.findById(ghost)).thenReturn(Optional.empty())
        assertThrows(NotFoundException::class.java) {
            service.update(expenseId, updateDto(amount = 100.0, shares = equalShares(100.0), payer = ghost))
        }
    }

    @Test
    fun `update rejects shares that do not sum to the amount`() {
        givenExistingExpense()
        val mismatched = listOf(ExpenseShare(userDto(alice), 50.0, ExpenseShareType.EXACT))
        assertThrows(IllegalArgumentException::class.java) {
            service.update(expenseId, updateDto(amount = 200.0, shares = mismatched))
        }
        verify(expenseShareRepository, never()).deleteAllByExpense(any())
    }

    @Test
    fun `update replaces shares, mutates fields and returns the new split`() {
        val existing = givenExistingExpense()
        whenever(userRepository.findById(bobId)).thenReturn(Optional.of(bob))

        val newShares = listOf(
            ExpenseShare(userDto(alice), 120.0, ExpenseShareType.PERCENT, shareValue = 60.0),
            ExpenseShare(userDto(bob), 80.0, ExpenseShareType.PERCENT, shareValue = 40.0),
        )
        val result = service.update(
            expenseId,
            updateDto(amount = 200.0, shares = newShares, payer = bobId, description = "Updated"),
        )

        // Scalar fields mutated on the managed entity.
        assertEquals(200.0, existing.amount)
        assertEquals("Updated", existing.description)
        assertEquals(bobId, existing.paidBy?.id)

        // Old shares deleted before new ones inserted.
        verify(expenseShareRepository).deleteAllByExpense(existing)
        verify(expenseShareRepository).flush()
        verify(expenseShareRepository).saveAll(any<List<ExpenseShareEntity>>())

        // Returned DTO carries the new split (regression: was empty before the fix).
        assertEquals(2, result.shares?.size)
        assertEquals(200.0, result.shares!!.sumOf { it.amount }, 0.001)
        assertEquals(ExpenseShareType.PERCENT, result.shares!!.first().shareType)
    }

    // ---------- attachReceipt() ----------

    @Test
    fun `attachReceipt stores the file and records sanitized metadata`() {
        val existing = givenExistingExpense()
        val bytes = "img".toByteArray()

        val result = service.attachReceipt(expenseId, "my photo!.png", "image/png", bytes)

        verify(receiptStorage).store(expenseId, bytes)
        assertEquals("my_photo_.png", existing.receiptFilename)
        assertEquals("image/png", existing.receiptContentType)
        assertEquals("my_photo_.png", result.receiptFilename)
    }

    @Test
    fun `attachReceipt strips path components from the filename`() {
        val existing = givenExistingExpense()
        service.attachReceipt(expenseId, "../../etc/passwd", "application/pdf", "x".toByteArray())
        assertEquals("passwd", existing.receiptFilename)
    }

    @Test
    fun `attachReceipt falls back to a default name when none is given`() {
        val existing = givenExistingExpense()
        service.attachReceipt(expenseId, null, "image/png", "x".toByteArray())
        assertEquals("receipt", existing.receiptFilename)
    }

    @Test
    fun `attachReceipt is forbidden for a non-creator`() {
        givenExistingExpense()
        beCurrentUser(bob)
        assertThrows(ForbiddenException::class.java) {
            service.attachReceipt(expenseId, "r.png", "image/png", "x".toByteArray())
        }
        verify(receiptStorage, never()).store(any(), any())
    }

    @Test
    fun `attachReceipt throws NotFound when the expense is missing`() {
        whenever(expenseRepository.findById(expenseId)).thenReturn(Optional.empty())
        assertThrows(NotFoundException::class.java) {
            service.attachReceipt(expenseId, "r.png", "image/png", "x".toByteArray())
        }
    }

    @Test
    fun `attachReceipt rejects an empty file`() {
        givenExistingExpense()
        assertThrows(IllegalArgumentException::class.java) {
            service.attachReceipt(expenseId, "r.png", "image/png", ByteArray(0))
        }
        verify(receiptStorage, never()).store(any(), any())
    }

    @Test
    fun `attachReceipt rejects files over the size limit`() {
        givenExistingExpense()
        val tooBig = ByteArray(10 * 1024 * 1024 + 1)
        assertThrows(IllegalArgumentException::class.java) {
            service.attachReceipt(expenseId, "r.png", "image/png", tooBig)
        }
        verify(receiptStorage, never()).store(any(), any())
    }

    @Test
    fun `attachReceipt rejects an unsupported content type`() {
        givenExistingExpense()
        assertThrows(IllegalArgumentException::class.java) {
            service.attachReceipt(expenseId, "notes.txt", "text/plain", "x".toByteArray())
        }
        verify(receiptStorage, never()).store(any(), any())
    }

    // ---------- getReceipt() ----------

    @Test
    fun `getReceipt returns the stored file with its metadata`() {
        givenExistingExpense(receiptFilename = "r.png", receiptContentType = "image/png")
        whenever(receiptStorage.load(expenseId)).thenReturn(ByteArrayResource("bytes".toByteArray()))

        val download = service.getReceipt(expenseId)

        assertEquals("r.png", download.filename)
        assertEquals("image/png", download.contentType)
        assertEquals("bytes", String(download.resource.contentAsByteArray))
    }

    @Test
    fun `getReceipt throws NotFound when no file is stored`() {
        givenExistingExpense(receiptFilename = "r.png", receiptContentType = "image/png")
        whenever(receiptStorage.load(expenseId)).thenReturn(null)
        assertThrows(NotFoundException::class.java) { service.getReceipt(expenseId) }
    }

    @Test
    fun `getReceipt is forbidden for a non-participant`() {
        givenExistingExpense(receiptFilename = "r.png")
        beCurrentUser(carol)
        assertThrows(ForbiddenException::class.java) { service.getReceipt(expenseId) }
        verify(receiptStorage, never()).load(any())
    }

    // ---------- removeReceipt() ----------

    @Test
    fun `removeReceipt deletes the file and clears metadata`() {
        val existing = givenExistingExpense(receiptFilename = "r.png", receiptContentType = "image/png")

        val result = service.removeReceipt(expenseId)

        verify(receiptStorage).delete(expenseId)
        assertNull(existing.receiptFilename)
        assertNull(existing.receiptContentType)
        assertNull(result.receiptFilename)
    }

    @Test
    fun `removeReceipt is forbidden for a non-creator`() {
        givenExistingExpense(receiptFilename = "r.png")
        beCurrentUser(bob)
        assertThrows(ForbiddenException::class.java) { service.removeReceipt(expenseId) }
        verify(receiptStorage, never()).delete(any())
    }

    // ---------- helpers ----------

    private fun beCurrentUser(user: UserEntity) {
        whenever(userService.getOrCreateUser()).thenReturn(userDto(user))
        whenever(userMapper.toEntity(any())).thenReturn(user)
    }

    private fun givenExistingExpense(
        receiptFilename: String? = null,
        receiptContentType: String? = null,
    ): ExpenseEntity {
        val expense = ExpenseEntity(
            id = expenseId,
            description = "Original",
            amount = 100.0,
            trip = trip,
            createdBy = alice,
            currency = Currency.EUR,
            paidBy = alice,
            dateOfExpense = LocalDateTime.now(),
            receiptFilename = receiptFilename,
            receiptContentType = receiptContentType,
        )
        whenever(expenseRepository.findById(expenseId)).thenReturn(Optional.of(expense))
        return expense
    }

    private fun updateDto(
        amount: Double,
        shares: List<ExpenseShare>,
        payer: UUID? = aliceId,
        description: String = "Original",
    ) = Expense(
        amount = amount,
        currency = Currency.EUR,
        dateOfExpense = LocalDateTime.now(),
        createdBy = userDto(alice),
        tripId = trip.id!!,
        id = expenseId,
        description = description,
        paidBy = payer?.let { User(id = it, username = "x") },
        shares = shares,
    )

    private fun equalShares(total: Double): List<ExpenseShare> {
        val half = total / 2
        return listOf(
            ExpenseShare(userDto(alice), half, ExpenseShareType.EQUAL),
            ExpenseShare(userDto(bob), total - half, ExpenseShareType.EQUAL),
        )
    }

    private fun userEntity(id: UUID, username: String) = UserEntity(
        id = id,
        username = username,
        password = null,
        firstName = username.replaceFirstChar { it.uppercase() },
        lastName = "Last",
        email = "$username@example.com",
        mobile = "",
        locale = Locale.ENGLISH,
        roles = setOf(UserRole.USER),
        authProvider = AuthProvider.DATABASE,
    )

    private fun userDto(e: UserEntity) = User(
        id = e.id, username = e.username, firstName = e.firstName, lastName = e.lastName, email = e.email,
    )
}
