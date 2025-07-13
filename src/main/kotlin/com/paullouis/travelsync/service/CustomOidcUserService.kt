package com.paullouis.travelsync.service

import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.stereotype.Service

@Service
class CustomOidcUserService(
    private val userService: IUserService
) : OAuth2UserService<OidcUserRequest, OidcUser> {

    private val delegate = OidcUserService()

    override fun loadUser(request: OidcUserRequest): OidcUser {
        val oidcUser = delegate.loadUser(request)
            ?: throw OAuth2AuthenticationException("Could not load user from OIDC provider")

        // provision the user in the local database
        userService.getOrCreateUser(oidcUser)
        return oidcUser
    }
}