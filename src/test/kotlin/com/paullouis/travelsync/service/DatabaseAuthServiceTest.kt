package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.AuthProvider
import com.paullouis.travelsync.model.generated.ChangePasswordRequest
import com.paullouis.travelsync.model.generated.User
import com.paullouis.travelsync.model.generated.UserRole
import com.paullouis.travelsync.repository.UserRepository
import com.paullouis.travelsync.utils.mapper.UserMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentCaptor
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.crypto.password.PasswordEncoder
import java.util.Locale
import java.util.Optional
import java.util.UUID

class DatabaseAuthServiceTest {

    private val userRepository: UserRepository = mock()
    private val userMapper: UserMapper = mock()
    private val passwordEncoder: PasswordEncoder = mock()
    private val authenticationManager: AuthenticationManager = mock()
    private val loginAttemptService: LoginAttemptService = mock()
    private val userService: IUserService = mock()

    private lateinit var service: DatabaseAuthService

    private val userId = UUID.randomUUID()
    private val storedHash = "{bcrypt}stored-hash"
    private val currentUser = User(id = userId, username = "alice")
    private val dbEntity = UserEntity(
        id = userId,
        username = "alice",
        password = storedHash,
        firstName = "Alice",
        lastName = "Smith",
        email = "alice@example.com",
        mobile = "",
        locale = Locale.ENGLISH,
        roles = setOf(UserRole.USER),
        authProvider = AuthProvider.DATABASE,
    )

    @BeforeEach
    fun setUp() {
        service = DatabaseAuthService(
            userRepository,
            userMapper,
            passwordEncoder,
            authenticationManager,
            loginAttemptService,
            userService,
        )
    }

    @Test
    fun `changePassword - happy path encodes and saves new password`() {
        whenever(userService.getOrCreateUser()).thenReturn(currentUser)
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(dbEntity))
        whenever(passwordEncoder.matches("oldPassword12!", storedHash)).thenReturn(true)
        whenever(passwordEncoder.encode("newPassword34!")).thenReturn("{bcrypt}new-hash")

        service.changePassword(ChangePasswordRequest("oldPassword12!", "newPassword34!"))

        val captor = ArgumentCaptor.forClass(UserEntity::class.java)
        verify(userRepository).save(captor.capture())
        assertEquals("{bcrypt}new-hash", captor.value.password)
    }

    @Test
    fun `changePassword - wrong current password throws BadCredentials and does not save`() {
        whenever(userService.getOrCreateUser()).thenReturn(currentUser)
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(dbEntity))
        whenever(passwordEncoder.matches("wrong", storedHash)).thenReturn(false)

        assertThrows(BadCredentialsException::class.java) {
            service.changePassword(ChangePasswordRequest("wrong", "newPassword34!"))
        }
        verify(userRepository, never()).save(any<UserEntity>())
    }

    @Test
    fun `changePassword - OAuth account is reported as bad credentials, not as account-type leak`() {
        val oauthEntity = dbEntity.copy(authProvider = AuthProvider.GOOGLE, password = null)
        whenever(userService.getOrCreateUser()).thenReturn(currentUser)
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(oauthEntity))

        assertThrows(BadCredentialsException::class.java) {
            service.changePassword(ChangePasswordRequest("anything", "newPassword34!"))
        }
        verify(userRepository, never()).save(any<UserEntity>())
        // Encoder must not be called — that would leak a timing/error difference
        // between "no password on file" and "password mismatch".
        verify(passwordEncoder, never()).matches(any<String>(), any<String>())
    }

    @Test
    fun `changePassword - new password equal to current is rejected`() {
        whenever(userService.getOrCreateUser()).thenReturn(currentUser)
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(dbEntity))
        whenever(passwordEncoder.matches("samePassword12!", storedHash)).thenReturn(true)

        assertThrows(IllegalArgumentException::class.java) {
            service.changePassword(ChangePasswordRequest("samePassword12!", "samePassword12!"))
        }
        verify(userRepository, never()).save(any<UserEntity>())
    }

    @Test
    fun `changePassword - new password shorter than minimum is rejected`() {
        whenever(userService.getOrCreateUser()).thenReturn(currentUser)
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(dbEntity))
        whenever(passwordEncoder.matches("oldPassword12!", storedHash)).thenReturn(true)

        assertThrows(IllegalArgumentException::class.java) {
            service.changePassword(ChangePasswordRequest("oldPassword12!", "tooShort"))
        }
        verify(userRepository, never()).save(any<UserEntity>())
    }

    @Test
    fun `changePassword - common new password is rejected`() {
        whenever(userService.getOrCreateUser()).thenReturn(currentUser)
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(dbEntity))
        whenever(passwordEncoder.matches("oldPassword12!", storedHash)).thenReturn(true)

        assertThrows(IllegalArgumentException::class.java) {
            // 12+ chars to clear the length check, but in COMMON_PASSWORDS.
            service.changePassword(ChangePasswordRequest("oldPassword12!", "Password1234"))
        }
        verify(userRepository, never()).save(any<UserEntity>())
    }

    @Test
    fun `changePassword - new password longer than max bytes is rejected`() {
        whenever(userService.getOrCreateUser()).thenReturn(currentUser)
        whenever(userRepository.findById(userId)).thenReturn(Optional.of(dbEntity))
        whenever(passwordEncoder.matches("oldPassword12!", storedHash)).thenReturn(true)

        // BCrypt truncates at 72 bytes — anything longer must be rejected so that
        // two passwords sharing the first 72 bytes can't authenticate against the
        // same hash.
        val tooLong = "a".repeat(MAX_PASSWORD_BYTES + 1)
        assertThrows(IllegalArgumentException::class.java) {
            service.changePassword(ChangePasswordRequest("oldPassword12!", tooLong))
        }
        verify(userRepository, never()).save(any<UserEntity>())
    }

    @Test
    fun `changePassword - missing user in repo throws IllegalState`() {
        whenever(userService.getOrCreateUser()).thenReturn(currentUser)
        whenever(userRepository.findById(userId)).thenReturn(Optional.empty())

        assertThrows(IllegalStateException::class.java) {
            service.changePassword(ChangePasswordRequest("oldPassword12!", "newPassword34!"))
        }
        verify(userRepository, never()).save(any<UserEntity>())
    }
}
