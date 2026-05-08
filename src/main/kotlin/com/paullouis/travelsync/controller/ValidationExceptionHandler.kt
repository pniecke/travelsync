package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.generated.ApiError
import com.paullouis.travelsync.service.exception.DuplicateUserException
import com.paullouis.travelsync.service.exception.SignInRateLimitedException
import com.paullouis.travelsync.service.exception.SignUpRateLimitedException
import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class ValidationExceptionHandler {

    private val logger = LoggerFactory.getLogger(ValidationExceptionHandler::class.java)

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleBodyValidation(ex: MethodArgumentNotValidException): ResponseEntity<Map<String, Any>> {
        val violations = ex.bindingResult.fieldErrors.map {
            mapOf("field" to it.field, "message" to (it.defaultMessage ?: "invalid"))
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(mapOf("error" to "Validation failed", "violations" to violations))
    }

    // Constraint violations on @Valid container elements (e.g. List<@Valid Trip>)
    // surface here rather than as MethodArgumentNotValidException.
    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolation(ex: ConstraintViolationException): ResponseEntity<Map<String, Any>> {
        val violations = ex.constraintViolations.map {
            mapOf("field" to it.propertyPath.toString(), "message" to it.message)
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(mapOf("error" to "Validation failed", "violations" to violations))
    }

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(ex: IllegalArgumentException): ResponseEntity<ApiError> {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiError(error = ex.message ?: "Bad request"))
    }

    @ExceptionHandler(BadCredentialsException::class)
    fun handleBadCredentials(ex: BadCredentialsException): ResponseEntity<ApiError> {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiError(error = ex.message ?: "Unauthorized"))
    }

    // Hierarchy: DuplicateEmailException extends DuplicateUserException, so
    // declaring the parent catches both and lets the controller decide whether
    // logging needs to disambiguate (it currently doesn't).
    @ExceptionHandler(DuplicateUserException::class)
    fun handleDuplicate(ex: DuplicateUserException): ResponseEntity<ApiError> {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiError(error = ex.message ?: "Conflict"))
    }

    @ExceptionHandler(SignUpRateLimitedException::class)
    fun handleSignUpRateLimit(ex: SignUpRateLimitedException): ResponseEntity<ApiError> {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header(HttpHeaders.RETRY_AFTER, ex.retryAfterSeconds.toString())
            .body(ApiError(error = ex.message ?: "Rate limited", retryAfterSeconds = ex.retryAfterSeconds))
    }

    @ExceptionHandler(SignInRateLimitedException::class)
    fun handleSignInRateLimit(ex: SignInRateLimitedException): ResponseEntity<ApiError> {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header(HttpHeaders.RETRY_AFTER, ex.retryAfterSeconds.toString())
            .body(ApiError(error = ex.message ?: "Rate limited", retryAfterSeconds = ex.retryAfterSeconds))
    }

    @ExceptionHandler(IllegalStateException::class)
    fun handleIllegalState(ex: IllegalStateException): ResponseEntity<ApiError> {
        // Bug or invariant violation. Don't leak the internal message to the
        // client; log the detail and return a generic 500.
        logger.error("Server invariant violated", ex)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiError(error = "Internal server error"))
    }
}
