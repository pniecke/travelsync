package com.paullouis.travelsync.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

/**
 * In-memory per-email login throttle.
 *
 * After [maxAttempts] consecutive failures, an email is locked out for [lockoutDuration].
 * The lock is released either when the window expires or after a successful login.
 *
 * Single-instance only. For multi-instance deployments, replace with a shared store
 * (Redis, DB table) — the API stays the same.
 */
@Service
class LoginAttemptService(
    @Value("\${app.security.login.max-attempts:5}")
    private val maxAttempts: Int,
    @Value("\${app.security.login.lockout-minutes:15}")
    lockoutMinutes: Long,
) {
    private val logger = LoggerFactory.getLogger(LoginAttemptService::class.java)

    private val lockoutDuration: Duration = Duration.ofMinutes(lockoutMinutes)
    private val attempts = ConcurrentHashMap<String, Attempt>()

    fun isBlocked(email: String): Boolean {
        val key = email.lowercase()
        val record = attempts[key] ?: return false
        if (record.failures < maxAttempts) return false
        val unlockAt = record.firstFailureAt.plus(lockoutDuration)
        return if (Instant.now().isBefore(unlockAt)) {
            true
        } else {
            attempts.remove(key)
            false
        }
    }

    fun retryAfterSeconds(email: String): Long {
        val record = attempts[email.lowercase()] ?: return 0
        val unlockAt = record.firstFailureAt.plus(lockoutDuration)
        return maxOf(0, Duration.between(Instant.now(), unlockAt).seconds)
    }

    fun loginFailed(email: String) {
        val key = email.lowercase()
        attempts.compute(key) { _, current ->
            val now = Instant.now()
            if (current == null || now.isAfter(current.firstFailureAt.plus(lockoutDuration))) {
                Attempt(failures = 1, firstFailureAt = now)
            } else {
                current.copy(failures = current.failures + 1)
            }
        }?.let {
            if (it.failures >= maxAttempts) {
                logger.warn("Account locked after {} failed attempts: {}", it.failures, key)
            }
        }
    }

    fun loginSucceeded(email: String) {
        attempts.remove(email.lowercase())
    }

    private data class Attempt(val failures: Int, val firstFailureAt: Instant)
}
