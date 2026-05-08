package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.AuthProvider
import com.paullouis.travelsync.model.generated.ChangePasswordRequest
import com.paullouis.travelsync.model.generated.SignInRequest
import com.paullouis.travelsync.model.generated.SignUpRequest
import com.paullouis.travelsync.model.generated.User
import com.paullouis.travelsync.model.generated.UserRole
import com.paullouis.travelsync.repository.UserRepository
import com.paullouis.travelsync.service.exception.DuplicateEmailException
import com.paullouis.travelsync.service.exception.DuplicateUserException
import com.paullouis.travelsync.utils.mapper.UserMapper
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.transaction.Transactional
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.LockedException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContext
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.context.HttpSessionSecurityContextRepository
import org.springframework.security.web.context.SecurityContextRepository
import org.springframework.stereotype.Service
import java.util.*

@Service
class DatabaseAuthService(
    private val userRepository: UserRepository,
    private val userMapper: UserMapper,
    private val passwordEncoder: PasswordEncoder,
    private val authenticationManager: AuthenticationManager,
    private val loginAttemptService: LoginAttemptService,
    private val userService: IUserService
) : IDatabaseAuthService {

    private val securityContextRepository: SecurityContextRepository = HttpSessionSecurityContextRepository()

    @Transactional
    override fun localSignUp(signUpRequest: SignUpRequest): User {
        val username = signUpRequest.username.trim()
        val email = signUpRequest.email.trim().lowercase()
        val rawPassword = signUpRequest.password

        // Validation
        if (username.isBlank()) {
            throw IllegalArgumentException("Username cannot be empty")
        }
        if (!EMAIL_PATTERN.matches(email)) {
            throw IllegalArgumentException("Invalid email address")
        }
        validatePassword(rawPassword)
        if (userRepository.existsByEmail(email)) {
            // Don't echo the email back to avoid trivial scraping. Username
            // collisions can be specific because usernames are public.
            throw DuplicateEmailException("An account with that email already exists. Please sign in instead.")
        }
        if (userRepository.findByUsername(username) != null) {
            throw DuplicateUserException("Username '$username' is already taken")
        }

        val user = UserEntity(
            username = username,
            password = passwordEncoder.encode(rawPassword),
            firstName = signUpRequest.firstName?.trim().orEmpty(),
            lastName = signUpRequest.lastName?.trim().orEmpty(),
            email = email,
            mobile = "",
            locale = Locale.ENGLISH,
            authProvider = AuthProvider.DATABASE,
            roles = setOf(UserRole.USER)
        )
        val saved = try {
            userRepository.save(user)
        } catch (e: DataIntegrityViolationException) {
            // Race window between the existence checks above and INSERT;
            // unique constraints on email/username are the authoritative guard.
            throw DuplicateUserException("We couldn't create your account. Please try again.")
        }
        return userMapper.toDto(saved)
    }

    /**
     * Performs Spring Security authentication and creates a session.
     * Returns the authenticated user.
     */
    override fun localSignIn(
        signInRequest: SignInRequest,
        servletRequest: HttpServletRequest,
        servletResponse: HttpServletResponse
    ): User {
        val identifier = signInRequest.identifier.trim()
        val rawPassword = signInRequest.password

        if (identifier.isBlank() || rawPassword.isBlank()) {
            throw BadCredentialsException("Identifier and password are required")
        }

        if (loginAttemptService.isBlocked(identifier)) {
            throw LockedException("Too many failed login attempts. Try again later.")
        }

        // Single lookup path: DatabaseUserDetailsService.loadUserByUsername (called by
        // authenticationManager.authenticate) resolves email-or-username, enforces
        // provider==DATABASE and password presence, and emits UsernameNotFoundException
        // for missing users. We don't pre-probe here so we (a) avoid a duplicate query
        // and (b) don't leak whether the identifier is registered with a different provider.
        val authRequest = UsernamePasswordAuthenticationToken(identifier, rawPassword)
        val authentication = try {
            authenticationManager.authenticate(authRequest)
        } catch (e: BadCredentialsException) {
            loginAttemptService.loginFailed(identifier)
            throw e
        }

        // Create security context and save to session
        val context: SecurityContext = SecurityContextHolder.createEmptyContext()
        context.authentication = authentication
        SecurityContextHolder.setContext(context)
        securityContextRepository.saveContext(context, servletRequest, servletResponse)

        loginAttemptService.loginSucceeded(identifier)

        // The principal name is the canonical email — see DatabaseUserDetailsService.
        val authenticatedEmail = authentication.name
        val userEntity = userRepository.findByEmail(authenticatedEmail)
            ?: throw IllegalStateException("Authenticated user not found in repository")
        return userMapper.toDto(userEntity)
    }

    override fun logout(servletRequest: HttpServletRequest) {
        try {
            servletRequest.logout()
        } catch (_: Exception) {
            // Fallback: clear context and invalidate session
            SecurityContextHolder.clearContext()
            servletRequest.session?.invalidate()
        }
    }

    @Transactional
    override fun changePassword(changePasswordRequest: ChangePasswordRequest) {
        val user = userService.getOrCreateUser()
        if (user.id == null) {
            throw IllegalStateException("Current user not found in repository")
        }
        val userEntity = userRepository.findById(user.id)
            .orElseThrow { IllegalStateException("Current user not found in repository") }
        if (userEntity.authProvider != AuthProvider.DATABASE) {
            // Don't reveal that this is an OAuth-only account; pretend the password
            // was simply wrong. Keeps account-type information out of the response.
            throw BadCredentialsException("Current password is incorrect")
        }
        if (!passwordEncoder.matches(changePasswordRequest.currentPassword, userEntity.password ?: "")) {
            throw BadCredentialsException("Current password is incorrect")
        }
        if (changePasswordRequest.currentPassword == changePasswordRequest.newPassword) {
            throw IllegalArgumentException("New password must differ from current password")
        }
        validatePassword(changePasswordRequest.newPassword)

        userEntity.password = passwordEncoder.encode(changePasswordRequest.newPassword)
        userRepository.save(userEntity)
    }
}

private val EMAIL_PATTERN = Regex("^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$")

const val MIN_PASSWORD_LENGTH = 12

// BCrypt silently truncates to 72 bytes; reject longer inputs so two passwords
// with identical first 72 bytes can't authenticate against the same hash.
const val MAX_PASSWORD_BYTES = 72

// All entries must be at least MIN_PASSWORD_LENGTH characters or the
// length check above rejects them first and this set is never consulted.
// Source: top entries from leaked-password lists (HaveIBeenPwned, RockYou,
// SecLists), filtered to >= 12 characters and lower-cased.
private val COMMON_PASSWORDS = setOf(
    "password1234",
    "password12345",
    "password123456",
    "passw0rd1234",
    "p@ssw0rd1234",
    "p@ssword1234",
    "qwerty123456",
    "qwertyuiop12",
    "qwerty1234567",
    "1234567890ab",
    "123456789012",
    "1234567891011",
    "iloveyou1234",
    "letmein12345",
    "welcome12345",
    "welcome123456",
    "admin1234567",
    "administrator",
    "trustno1234567",
    "abcdef123456",
    "monkey1234567",
    "football12345",
    "baseball12345",
    "michael12345",
    "asdfghjkl123",
    "zxcvbnm12345",
    "1qaz2wsx3edc",
    "1q2w3e4r5t6y",
    "passwordpassword",
    "iloveyouiloveyou",
    "changeme1234",
)

internal fun validatePassword(rawPassword: String) {
    if (rawPassword.length < MIN_PASSWORD_LENGTH) {
        throw IllegalArgumentException("Password must be at least $MIN_PASSWORD_LENGTH characters long")
    }
    if (rawPassword.toByteArray(Charsets.UTF_8).size > MAX_PASSWORD_BYTES) {
        throw IllegalArgumentException("Password is too long (maximum $MAX_PASSWORD_BYTES bytes)")
    }
    if (rawPassword.lowercase() in COMMON_PASSWORDS) {
        throw IllegalArgumentException("Password is too common. Please choose something less guessable.")
    }
}

