package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.generated.User
import com.paullouis.travelsync.service.UserService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class UserController(
    private val userService: UserService
) : UserApi {

    override fun getLoggedInUser(): ResponseEntity<User> {
        return ResponseEntity.ok(
            userService.getOrCreateUser()
        )
    }
}