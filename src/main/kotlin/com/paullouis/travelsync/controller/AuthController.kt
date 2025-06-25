package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.User
import com.paullouis.travelsync.service.UserService
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/user")
class AuthController(
    private val userService: UserService
) {

    @GetMapping("/me")
    fun me(@AuthenticationPrincipal oidcUser: OidcUser): User {
        return userService.getOrCreateUser(oidcUser)
    }
}