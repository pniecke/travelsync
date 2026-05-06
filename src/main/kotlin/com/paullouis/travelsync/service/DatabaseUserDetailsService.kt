package com.paullouis.travelsync.service

import com.paullouis.travelsync.model.AuthProvider
import com.paullouis.travelsync.repository.UserRepository
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class DatabaseUserDetailsService(
    private val userRepository: UserRepository
) : UserDetailsService {
    // Spring's UserDetailsService contract pins this method name; the parameter is
    // really an identifier (email or username), so we delegate to a clearly-named
    // helper to keep the misleading "username" wording confined to this one line.
    override fun loadUserByUsername(identifier: String): UserDetails =
        loadUserByIdentifier(identifier)

    private fun loadUserByIdentifier(identifier: String): UserDetails {
        val trimmed = identifier.trim()
        // Email and username are stored in distinct columns. Treat the input as an
        // email when it contains '@', otherwise as a username — this avoids
        // ambiguity if the same value happened to exist in both columns.
        val userEntity = if (trimmed.contains('@')) {
            userRepository.findByEmail(trimmed.lowercase())
        } else {
            userRepository.findByUsername(trimmed)
        } ?: throw UsernameNotFoundException("User not found: $identifier")

        if (userEntity.authProvider != AuthProvider.DATABASE) {
            throw UsernameNotFoundException("User does not use database authentication")
        }

        if (userEntity.password.isNullOrBlank()) {
            throw IllegalStateException("User account is not configured for password authentication")
        }

        val authorities = userEntity.roles.map { SimpleGrantedAuthority("ROLE_${it.name}") }
        return User(userEntity.email, userEntity.password, authorities)
    }
}

