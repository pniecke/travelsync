package com.paullouis.travelsync.service.exception

/**
 * Thrown when the current user is authenticated but lacks permission for the
 * requested operation. Mapped to HTTP 403 by
 * [com.paullouis.travelsync.controller.ValidationExceptionHandler].
 */
open class ForbiddenException(message: String) : RuntimeException(message)
