package com.paullouis.travelsync.service.exception

/**
 * Thrown when an IP exceeds the signup rate limit. Carries the retry-after
 * window so [com.paullouis.travelsync.controller.ValidationExceptionHandler]
 * can build a 429 response with both the `Retry-After` header and the
 * `retryAfterSeconds` field in the body.
 */
class SignUpRateLimitedException(
    val retryAfterSeconds: Long,
    message: String,
) : RuntimeException(message)
