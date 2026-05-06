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
    override fun loadUserByUsername(username: String): UserDetails {
        val userEntity = userRepository.findByEmail(username)
            ?: throw UsernameNotFoundException("User not found: $username")

        // Ensure user is configured for database authentication
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

