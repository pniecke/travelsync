package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.AuthProvider
import com.paullouis.travelsync.model.generated.UpdateUserRequest
import com.paullouis.travelsync.model.generated.User
import com.paullouis.travelsync.model.generated.UserRole
import com.paullouis.travelsync.repository.UserRepository
import com.paullouis.travelsync.service.exception.DuplicateEmailException
import com.paullouis.travelsync.service.exception.DuplicateUserException
import com.paullouis.travelsync.utils.mapper.UserMapper
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentCaptor
import org.mockito.kotlin.any
import org.mockito.kotlin.argThat
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.User as SpringUser
import java.util.Locale
import java.util.Optional
import java.util.UUID

class UserServiceTest {

    private val userRepository: UserRepository = mock()
    private val userMapper: UserMapper = mock()

    private lateinit var service: UserService

    private val userId = UUID.randomUUID()
    private val baseEntity = UserEntity(
        id = userId,
        username = "alice",
        password = "{bcrypt}stored-hash",
        firstName = "Alice",
        lastName = "Smith",
        email = "alice@example.com",
        mobile = "+41 79 000 00 00",
        locale = Locale.ENGLISH,
        roles = setOf(UserRole.USER),
        authProvider = AuthProvider.DATABASE,
    )

    @BeforeEach
    fun setUp() {
        service = UserService(userRepository, userMapper)
        // Authenticate as alice — UserService.getOrCreateUser() resolves the
        // session principal via UserDetails.username (== email).
        val principal = SpringUser(
            "alice@example.com",
            "{bcrypt}stored-hash",
            listOf(SimpleGrantedAuthority("ROLE_USER")),
        )
        SecurityContextHolder.getContext().authentication =
            UsernamePasswordAuthenticationToken(principal, null, principal.authorities)
        // The session lookup goes through findByEmail.
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(baseEntity)
        // Default mapper passthrough — tests that care about the result override it.
        whenever(userMapper.toDto(any<UserEntity>())).thenAnswer { invocation ->
            val e = invocation.arguments[0] as UserEntity
            User(
                id = e.id, username = e.username, firstName = e.firstName, lastName = e.lastName,
                email = e.email, mobile = e.mobile, locale = e.locale.toLanguageTag(),
            )
        }
    }

    @AfterEach
    fun tearDown() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `updateLoggedInUser - applies all provided fields`() {
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(baseEntity))
        whenever(userRepository.findByUsername("alice2")).thenReturn(null)
        whenever(userRepository.existsByEmail("alice2@example.com")).thenReturn(false)
        whenever(userRepository.save(any<UserEntity>())).thenAnswer { it.arguments[0] }

        val update = UpdateUserRequest(
            username = "alice2",
            firstName = "Alicia",
            lastName = "Smythe",
            email = "alice2@example.com",
            mobile = "+41 79 111 11 11",
            locale = "de-CH",
        )
        service.updateLoggedInUser(update)

        val captor = ArgumentCaptor.forClass(UserEntity::class.java)
        verify(userRepository).save(captor.capture())
        val saved = captor.value
        assertEquals(userId, saved.id)
        assertEquals("alice2", saved.username)
        assertEquals("Alicia", saved.firstName)
        assertEquals("Smythe", saved.lastName)
        assertEquals("alice2@example.com", saved.email)
        assertEquals("+41 79 111 11 11", saved.mobile)
        assertEquals(Locale.forLanguageTag("de-CH"), saved.locale)
    }

    @Test
    fun `updateLoggedInUser - missing fields leave existing values untouched`() {
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(baseEntity))
        whenever(userRepository.save(any<UserEntity>())).thenAnswer { it.arguments[0] }

        service.updateLoggedInUser(UpdateUserRequest(firstName = "Alicia"))

        verify(userRepository).save(argThat<UserEntity> {
            id == userId &&
                username == "alice" &&
                firstName == "Alicia" &&
                lastName == "Smith" &&
                email == "alice@example.com" &&
                mobile == "+41 79 000 00 00" &&
                locale == Locale.ENGLISH
        })
    }

    @Test
    fun `updateLoggedInUser - body 'id' is ignored, target is the authenticated user`() {
        // Mass-assignment guard: even if the client sends a foreign id (not modelled
        // in UpdateUserRequest, but we verify by other means that the DB lookup is
        // keyed on the principal). findById must be called with the principal's id.
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(baseEntity))
        whenever(userRepository.save(any<UserEntity>())).thenAnswer { it.arguments[0] }

        service.updateLoggedInUser(UpdateUserRequest(firstName = "Whoever"))

        verify(userRepository).findById(userId)
        verify(userRepository, never()).findById(argThat<UUID> { this != userId })
    }

    @Test
    fun `updateLoggedInUser - username collision throws DuplicateUserException`() {
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(baseEntity))
        whenever(userRepository.findByUsername("taken")).thenReturn(baseEntity.copy(id = UUID.randomUUID(), username = "taken"))

        assertThrows(DuplicateUserException::class.java) {
            service.updateLoggedInUser(UpdateUserRequest(username = "taken"))
        }
        verify(userRepository, never()).save(any<UserEntity>())
    }

    @Test
    fun `updateLoggedInUser - email collision throws DuplicateEmailException`() {
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(baseEntity))
        whenever(userRepository.existsByEmail("taken@example.com")).thenReturn(true)

        assertThrows(DuplicateEmailException::class.java) {
            service.updateLoggedInUser(UpdateUserRequest(email = "taken@example.com"))
        }
        verify(userRepository, never()).save(any<UserEntity>())
    }

    @Test
    fun `updateLoggedInUser - email is normalized to lowercase`() {
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(baseEntity))
        whenever(userRepository.existsByEmail("alice2@example.com")).thenReturn(false)
        whenever(userRepository.save(any<UserEntity>())).thenAnswer { it.arguments[0] }

        service.updateLoggedInUser(UpdateUserRequest(email = "Alice2@Example.COM"))

        verify(userRepository).save(argThat<UserEntity> { email == "alice2@example.com" })
    }

    @Test
    fun `updateLoggedInUser - blank username falls back to existing username`() {
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(baseEntity))
        whenever(userRepository.save(any<UserEntity>())).thenAnswer { it.arguments[0] }

        service.updateLoggedInUser(UpdateUserRequest(username = "   "))

        verify(userRepository).save(argThat<UserEntity> { username == "alice" })
        // Blank username must not trigger a uniqueness probe.
        verify(userRepository, never()).findByUsername(any<String>())
    }
}
