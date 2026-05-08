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
import jakarta.transaction.Transactional
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.stereotype.Service
import java.util.*

@Service
class UserService(
    private val userRepository: UserRepository,
    private val userMapper: UserMapper
) : IUserService {

    private val logger = LoggerFactory.getLogger(UserService::class.java)

    override fun getOrCreateUser(): User {
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw AuthenticationCredentialsNotFoundException("No authenticated user found")

        val principal = authentication.principal
            ?: throw AuthenticationCredentialsNotFoundException("Authentication principal is null")

        return when (principal) {
            is OidcUser -> {
                logger.debug("Getting/creating user from OIDC principal")
                getOrCreateUser(principal)
            }

            is UserDetails -> {
                logger.debug("Getting user from UserDetails principal: ${principal.username}")
                userRepository.findByEmail(principal.username)?.let(userMapper::toDto)
                    ?: throw UsernameNotFoundException("User not found: ${principal.username}")
            }

            else -> {
                logger.error("Unsupported principal type: ${principal::class.java.name}")
                throw IllegalStateException("Unsupported principal type: ${principal::class.java.name}")
            }
        }
    }

    override fun getOrCreateUser(oidcUser: OidcUser): User {
        val googleId = oidcUser.subject
            ?: throw AuthenticationCredentialsNotFoundException("Google ID (subject) not found in OIDC claims")

        val email = oidcUser.email
            ?: throw AuthenticationCredentialsNotFoundException("Email not found in OIDC claims")

        logger.debug("Looking up user by external ID: $googleId")

        userRepository.findByExternalId(googleId)?.let {
            logger.debug("Found existing OAuth2 user by externalId: ${it.email}")
            return userMapper.toDto(it)
        }

        userRepository.findByEmail(email)?.let { existing ->
            if (existing.authProvider != AuthProvider.GOOGLE) {
                throw IllegalStateException(
                    "An account with this email already exists using ${existing.authProvider} authentication"
                )
            }
            // Same provider but unknown externalId (e.g., legacy row) — link and return.
            logger.info("Linking existing GOOGLE user '${existing.email}' to externalId $googleId")
            val linked = existing.copy(externalId = googleId)
            return userMapper.toDto(userRepository.save(linked))
        }

        logger.info("Creating new OAuth2 user: $email")
        return createNewOAuthUser(oidcUser)
    }

    private fun createNewOAuthUser(oidcUser: OidcUser): User {
        val username = oidcUser.preferredUsername ?: oidcUser.email?.substringBefore("@") ?: "user"
        val firstName = oidcUser.givenName ?: ""
        val lastName = oidcUser.familyName ?: ""
        val email = oidcUser.email
            ?: throw AuthenticationCredentialsNotFoundException("Email is required for user creation")
        val locale = getUserLocale(oidcUser.locale)
        val mobile = oidcUser.phoneNumber ?: ""
        val externalId = oidcUser.subject
            ?: throw AuthenticationCredentialsNotFoundException("Subject (external ID) is required")

        val userEntity = UserEntity(
            username = username,
            password = null, // OAuth users don't have passwords
            firstName = firstName,
            lastName = lastName,
            email = email,
            mobile = mobile,
            locale = locale,
            trips = mutableListOf(),
            authProvider = AuthProvider.GOOGLE,
            externalId = externalId,
            roles = setOf(UserRole.USER)
        )

        val savedUser = userRepository.save(userEntity)
        logger.info("Created new OAuth2 user: ${savedUser.email} with ID: ${savedUser.id}")
        return userMapper.toDto(savedUser)
    }

    override fun getAllUsers(): List<User> {
        // /api/users feeds the participant-search dropdown for any authenticated user.
        // Return only the fields needed for that UI (id, username, firstName, lastName)
        // and strip PII (email, mobile, locale, roles). A separate ADMIN-only endpoint
        // can expose the full record if/when it's needed.
        return userRepository.findAll().map { entity ->
            User(
                id = entity.id,
                username = entity.username,
                firstName = entity.firstName,
                lastName = entity.lastName,
            )
        }
    }

    @Transactional
    override fun updateLoggedInUser(update: UpdateUserRequest): User {
        // Resolve target from session — never trust an `id` from the request body.
        val current = getOrCreateUser()
        val id = current.id ?: throw IllegalStateException("Authenticated user has no id")
        val existing = userRepository.findById(id)
            .orElseThrow { IllegalStateException("Authenticated user not found in repository") }

        val newUsername = update.username?.trim()?.takeIf { it.isNotBlank() } ?: existing.username
        val newEmail = update.email?.trim()?.lowercase()?.takeIf { it.isNotBlank() } ?: existing.email

        if (newUsername != existing.username && userRepository.findByUsername(newUsername) != null) {
            throw DuplicateUserException("Username '$newUsername' is already taken")
        }
        if (newEmail != existing.email && userRepository.existsByEmail(newEmail)) {
            throw DuplicateEmailException("An account with that email already exists")
        }

        val updated = existing.copy(
            username = newUsername,
            email = newEmail,
            firstName = update.firstName ?: existing.firstName,
            lastName = update.lastName ?: existing.lastName,
            mobile = update.mobile ?: existing.mobile,
            locale = update.locale?.let(::getUserLocale) ?: existing.locale,
        )
        return try {
            userMapper.toDto(userRepository.save(updated))
        } catch (e: DataIntegrityViolationException) {
            // Race window between the existence checks above and UPDATE.
            throw DuplicateUserException("Username or email is already in use")
        }
    }

    private fun getUserLocale(stringLocale: String?): Locale {
        if (stringLocale.isNullOrBlank()) {
            return Locale.ENGLISH
        }
        return try {
            Locale.forLanguageTag(stringLocale)
        } catch (e: Exception) {
            logger.warn("Invalid locale string: $stringLocale, defaulting to ENGLISH")
            Locale.ENGLISH
        }
    }
}

