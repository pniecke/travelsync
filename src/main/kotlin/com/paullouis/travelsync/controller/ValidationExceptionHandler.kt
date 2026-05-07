package com.paullouis.travelsync.controller

import jakarta.validation.ConstraintViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class ValidationExceptionHandler {

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
}
