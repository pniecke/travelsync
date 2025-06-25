package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.AuthProvider
import com.paullouis.travelsync.model.User
import com.paullouis.travelsync.repository.UserRepository
import com.paullouis.travelsync.utils.mapper.UserMapper
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.stereotype.Service
import java.util.*

@Service
class UserService(
    private val userRepository: UserRepository,
    private val userMapper: UserMapper
) : IUserService {
    override fun getOrCreateUser(oidcUser: OidcUser): User {
        val googleId = oidcUser.subject
            ?: throw AuthenticationCredentialsNotFoundException("Google ID not found")

        return userRepository.findByExternalId(googleId)
            ?.let(userMapper::toDto)
            ?: createNewUser(oidcUser)
    }

    private fun createNewUser(oidcUser: OidcUser): User {
        val username = oidcUser.preferredUsername ?: ""
        val firstName = oidcUser.givenName ?: ""
        val lastName = oidcUser.familyName ?: ""
        val email = oidcUser.email ?: throw AuthenticationCredentialsNotFoundException("Email not found in OIDC user claims")
        val locale = oidcUser.locale ?: Locale.GERMAN.language
        val mobile = oidcUser.phoneNumber ?: ""
        val externalId = oidcUser.subject

        return UserEntity(
            username = username,
            firstName = firstName,
            lastName = lastName,
            email = email,
            mobile = mobile,
            locale = locale,
            trips = mutableListOf(),
            authProvider = AuthProvider.GOOGLE,
            externalId = externalId
        ).let {
            userRepository.save(it)
            userMapper.toDto(it)
        }
    }
}