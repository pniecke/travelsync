package com.paullouis.travelsync.service.exception

/**
 * Thrown when a requested entity does not exist. Mapped to HTTP 404 by
 * [com.paullouis.travelsync.controller.ValidationExceptionHandler].
 */
open class NotFoundException(message: String) : RuntimeException(message)
