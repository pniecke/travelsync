package com.paullouis.travelsync.service.exception

/**
 * Thrown when the request is well-formed and authorised but cannot succeed
 * because of current resource state (e.g. trying to remove a participant who
 * still owes money). Mapped to HTTP 409 by
 * [com.paullouis.travelsync.controller.ValidationExceptionHandler].
 */
open class ConflictException(message: String) : RuntimeException(message)
