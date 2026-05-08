package com.paullouis.travelsync.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.ArrayDeque
import java.util.concurrent.atomic.AtomicLong

/**
 * In-memory ring buffer of recent security-relevant events.
 *
 * Used by the admin Logging & Monitoring page to surface auth failures,
 * lockouts, throttle hits, and signup abuse without needing a real log
 * pipeline. Capped at [capacity] entries so a noisy attacker cannot
 * exhaust memory.
 *
 * Single-instance only; not durable. For multi-instance deployments,
 * replace with a shared store (Loki, ELK, Postgres) — the API stays the same.
 */
@Service
class SecurityEventService(
    @Value("\${app.security.events.capacity:500}")
    private val capacity: Int,
) {
    enum class EventType {
        LOGIN_FAILURE,
        LOGIN_SUCCESS,
        ACCOUNT_LOCKED,
        IP_LOGIN_THROTTLED,
        SIGNUP_THROTTLED,
        SIGNUP_SUCCESS,
    }

    data class SecurityEvent(
        val id: Long,
        val timestamp: Instant,
        val type: EventType,
        val identifier: String?,
        val ip: String?,
        val message: String,
    )

    private val seq = AtomicLong(0)
    private val buffer = ArrayDeque<SecurityEvent>(capacity)
    private val lock = Any()

    fun record(
        type: EventType,
        identifier: String? = null,
        ip: String? = null,
        message: String,
    ) {
        val event = SecurityEvent(
            id = seq.incrementAndGet(),
            timestamp = Instant.now(),
            type = type,
            identifier = identifier,
            ip = ip,
            message = message,
        )
        synchronized(lock) {
            if (buffer.size >= capacity) buffer.pollFirst()
            buffer.addLast(event)
        }
    }

    fun recent(limit: Int = capacity): List<SecurityEvent> {
        synchronized(lock) {
            val all = buffer.toList()
            return if (all.size <= limit) all.reversed() else all.takeLast(limit).reversed()
        }
    }

    data class Stats(
        val total: Int,
        val byType: Map<EventType, Int>,
        val topIps: List<Pair<String, Int>>,
        val topIdentifiers: List<Pair<String, Int>>,
    )

    fun stats(): Stats {
        synchronized(lock) {
            val all = buffer.toList()
            val byType = EventType.entries.associateWith { t -> all.count { it.type == t } }
            val topIps = all.mapNotNull { it.ip }
                .groupingBy { it }.eachCount()
                .entries.sortedByDescending { it.value }
                .take(10).map { it.key to it.value }
            val topIdentifiers = all.mapNotNull { it.identifier }
                .groupingBy { it }.eachCount()
                .entries.sortedByDescending { it.value }
                .take(10).map { it.key to it.value }
            return Stats(all.size, byType, topIps, topIdentifiers)
        }
    }
}
