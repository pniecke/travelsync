package com.paullouis.travelsync.service.exception

/**
 * Thrown when an account creation or update would violate the username/email
 * uniqueness constraint. Mapped to HTTP 409 by [com.paullouis.travelsync.controller.ValidationExceptionHandler].
 */
open class DuplicateUserException(message: String) : RuntimeException(message)
