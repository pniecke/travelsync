package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.AuthProvider
import com.paullouis.travelsync.model.generated.SignInRequest
import com.paullouis.travelsync.model.generated.SignUpRequest
import com.paullouis.travelsync.model.generated.User
import com.paullouis.travelsync.model.generated.UserRole
import com.paullouis.travelsync.repository.UserRepository
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
) {

    private val securityContextRepository: SecurityContextRepository = HttpSessionSecurityContextRepository()

    @Transactional
    fun localSignUp(signUpRequest: SignUpRequest): User {
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
        if (rawPassword.length < 8) {
            throw IllegalArgumentException("Password must be at least 8 characters long")
        }
        if (userRepository.existsByEmail(email)) {
            throw DuplicateUserException("User with email '$email' already exists")
        }
        if (userRepository.findByUsername(username) != null) {
            throw DuplicateUserException("Username '$username' is already taken")
        }

        val user = UserEntity(
            username = username,
            password = passwordEncoder.encode(rawPassword),
            firstName = "",
            lastName = "",
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
            throw DuplicateUserException("User with email '$email' or username '$username' already exists")
        }
        return userMapper.toDto(saved)
    }

    /**
     * Performs Spring Security authentication and creates a session.
     * Returns the authenticated user.
     */
    fun localSignIn(
        signInRequest: SignInRequest,
        servletRequest: HttpServletRequest,
        servletResponse: HttpServletResponse
    ): User {
        val email = signInRequest.email.trim().lowercase()
        val rawPassword = signInRequest.password

        if (email.isBlank() || rawPassword.isBlank()) {
            throw BadCredentialsException("Email and password are required")
        }

        if (loginAttemptService.isBlocked(email)) {
            throw LockedException("Too many failed login attempts. Try again later.")
        }

        // Single lookup path: DatabaseUserDetailsService.loadUserByUsername (called by
        // authenticationManager.authenticate) already enforces provider==DATABASE and
        // password presence, and emits a UsernameNotFoundException for missing users.
        // We don't pre-probe with findByEmail here so we (a) avoid a duplicate query
        // and (b) don't leak whether the email is registered with a different provider.
        val authRequest = UsernamePasswordAuthenticationToken(email, rawPassword)
        val authentication = try {
            authenticationManager.authenticate(authRequest)
        } catch (e: BadCredentialsException) {
            loginAttemptService.loginFailed(email)
            throw e
        }

        // Create security context and save to session
        val context: SecurityContext = SecurityContextHolder.createEmptyContext()
        context.authentication = authentication
        SecurityContextHolder.setContext(context)
        securityContextRepository.saveContext(context, servletRequest, servletResponse)

        loginAttemptService.loginSucceeded(email)

        val userEntity = userRepository.findByEmail(email)
            ?: throw IllegalStateException("Authenticated user not found in repository")
        return userMapper.toDto(userEntity)
    }

    fun logout(servletRequest: HttpServletRequest) {
        try {
            servletRequest.logout()
        } catch (e: Exception) {
            // Fallback: clear context and invalidate session
            SecurityContextHolder.clearContext()
            servletRequest.session?.invalidate()
        }
    }
}

/**
 * Exception thrown when attempting to create a user that already exists
 */
class DuplicateUserException(message: String) : RuntimeException(message)

private val EMAIL_PATTERN = Regex("^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$")

