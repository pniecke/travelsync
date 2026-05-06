package com.paullouis.travelsync.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

/**
 * In-memory per-IP login failure throttle.
 *
 * Complements [LoginAttemptService], which is keyed on the identifier and
 * therefore vulnerable to account-lockout DoS — anyone can lock a victim out
 * by spamming wrong passwords against their email. This service limits
 * **failures per IP** within a rolling [window], which is what actually
 * deters credential stuffing without giving an attacker the ability to lock
 * out arbitrary users.
 *
 * Threshold is intentionally higher than the per-identifier limit because
 * many legitimate users share a NAT'd public IP (offices, mobile carriers,
 * coffee shops). Successful logins clear the IP's counter so a single
 * mistype-then-succeed legit user doesn't accumulate state.
 *
 * Single-instance only. For multi-instance deployments, replace with a shared
 * store (Redis, DB table) — the API stays the same.
 */
@Service
class LoginIpThrottle(
    @Value("\${app.security.login.ip-max-failures:20}")
    private val maxFailures: Int,
    @Value("\${app.security.login.ip-window-minutes:15}")
    windowMinutes: Long,
) {
    private val logger = LoggerFactory.getLogger(LoginIpThrottle::class.java)

    private val window: Duration = Duration.ofMinutes(windowMinutes)
    private val failures = ConcurrentHashMap<String, Failure>()

    fun isBlocked(ip: String): Boolean {
        val record = failures[ip] ?: return false
        if (record.count < maxFailures) return false
        val unlockAt = record.windowStartedAt.plus(window)
        return if (Instant.now().isBefore(unlockAt)) {
            true
        } else {
            failures.remove(ip)
            false
        }
    }

    fun retryAfterSeconds(ip: String): Long {
        val record = failures[ip] ?: return 0
        val unlockAt = record.windowStartedAt.plus(window)
        return maxOf(0, Duration.between(Instant.now(), unlockAt).seconds)
    }

    fun loginFailed(ip: String) {
        failures.compute(ip) { _, current ->
            val now = Instant.now()
            if (current == null || now.isAfter(current.windowStartedAt.plus(window))) {
                Failure(count = 1, windowStartedAt = now)
            } else {
                current.copy(count = current.count + 1)
            }
        }?.let {
            if (it.count == maxFailures) {
                logger.warn("Login IP throttle reached for {} ({} failures in window)", ip, it.count)
            }
        }
    }

    fun loginSucceeded(ip: String) {
        failures.remove(ip)
    }

    private data class Failure(val count: Int, val windowStartedAt: Instant)
}
