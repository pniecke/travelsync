package com.paullouis.travelsync.service

import com.paullouis.travelsync.model.generated.User
import org.springframework.security.oauth2.core.oidc.user.OidcUser

interface IUserService {

    fun getOrCreateUser(oidcUser: OidcUser): User

    fun getOrCreateUser(): User
}