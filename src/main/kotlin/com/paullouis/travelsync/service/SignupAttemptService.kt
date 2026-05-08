package com.paullouis.travelsync.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

/**
 * In-memory per-IP signup throttle.
 *
 * Counts every signup attempt (success or failure) within a rolling [window].
 * Once an IP exceeds [maxAttempts], further signups are rejected until the
 * window expires. This makes bulk email-enumeration via /auth/signup
 * impractical without removing the user-friendly "email already in use"
 * response on the happy path.
 *
 * Single-instance only. For multi-instance deployments, replace with a shared
 * store (Redis, DB table) — the API stays the same.
 */
@Service
class SignupAttemptService(
    @Value("\${app.security.signup.max-attempts:5}")
    private val maxAttempts: Int,
    @Value("\${app.security.signup.window-minutes:15}")
    windowMinutes: Long,
    private val securityEventService: SecurityEventService,
) {
    private val logger = LoggerFactory.getLogger(SignupAttemptService::class.java)

    private val window: Duration = Duration.ofMinutes(windowMinutes)
    private val attempts = ConcurrentHashMap<String, Attempt>()

    fun isBlocked(ip: String): Boolean {
        val record = attempts[ip] ?: return false
        if (record.count < maxAttempts) return false
        val unlockAt = record.windowStartedAt.plus(window)
        return if (Instant.now().isBefore(unlockAt)) {
            true
        } else {
            attempts.remove(ip)
            false
        }
    }

    fun retryAfterSeconds(ip: String): Long {
        val record = attempts[ip] ?: return 0
        val unlockAt = record.windowStartedAt.plus(window)
        return maxOf(0, Duration.between(Instant.now(), unlockAt).seconds)
    }

    fun recordAttempt(ip: String) {
        attempts.compute(ip) { _, current ->
            val now = Instant.now()
            if (current == null || now.isAfter(current.windowStartedAt.plus(window))) {
                Attempt(count = 1, windowStartedAt = now)
            } else {
                current.copy(count = current.count + 1)
            }
        }?.let {
            if (it.count == maxAttempts) {
                logger.warn("Signup rate limit reached for IP {} ({} attempts in window)", ip, it.count)
                securityEventService.record(
                    type = SecurityEventService.EventType.SIGNUP_THROTTLED,
                    ip = ip,
                    message = "Signup throttle triggered (${it.count} attempts in window)",
                )
            }
        }
    }

    private data class Attempt(val count: Int, val windowStartedAt: Instant)
}
