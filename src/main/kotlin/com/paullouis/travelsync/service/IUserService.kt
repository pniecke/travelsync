package com.paullouis.travelsync.service

import com.paullouis.travelsync.model.generated.UpdateUserRequest
import com.paullouis.travelsync.model.generated.User
import org.springframework.security.oauth2.core.oidc.user.OidcUser

interface IUserService {

    fun getOrCreateUser(oidcUser: OidcUser): User

    fun getOrCreateUser(): User

    fun getAllUsers(): List<User>

    /**
     * Apply a partial profile update to the *currently authenticated* user.
     * The id is taken from the session; `id`, `roles`, and `password` cannot
     * be set through this path.
     */
    fun updateLoggedInUser(update: UpdateUserRequest): User
}