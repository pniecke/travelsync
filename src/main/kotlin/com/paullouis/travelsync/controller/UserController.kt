package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.generated.UpdateUserRequest
import com.paullouis.travelsync.model.generated.User
import com.paullouis.travelsync.service.IUserService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class UserController(
    private val userService: IUserService,
) : UserApi {

    override fun getLoggedInUser(): ResponseEntity<User> {
        return ResponseEntity.ok(userService.getOrCreateUser())
    }

    override fun getAllUsers(): ResponseEntity<List<User>> {
        return ResponseEntity.ok(userService.getAllUsers())
    }

    override fun updateLoggedInUser(updateUserRequest: UpdateUserRequest): ResponseEntity<User> {
        // Errors (DuplicateUserException, IllegalArgumentException) propagate
        // to ValidationExceptionHandler which maps them to 409 / 400.
        return ResponseEntity.ok(userService.updateLoggedInUser(updateUserRequest))
    }
}
