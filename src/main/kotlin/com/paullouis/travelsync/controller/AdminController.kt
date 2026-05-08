package com.paullouis.travelsync.controller

import com.paullouis.travelsync.service.SecurityEventService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

@RestController
@RequestMapping("/admin")
class AdminController(
    private val securityEventService: SecurityEventService,
) {

    data class SecurityEventDto(
        val id: Long,
        val timestamp: Instant,
        val type: String,
        val identifier: String?,
        val ip: String?,
        val message: String,
    )

    data class SecurityStatsDto(
        val total: Int,
        val byType: Map<String, Int>,
        val topIps: List<TopEntryDto>,
        val topIdentifiers: List<TopEntryDto>,
    )

    data class TopEntryDto(val key: String, val count: Int)

    @GetMapping("/security-events")
    fun securityEvents(
        @RequestParam(required = false, defaultValue = "200") limit: Int,
    ): List<SecurityEventDto> {
        val capped = limit.coerceIn(1, 1000)
        return securityEventService.recent(capped).map {
            SecurityEventDto(
                id = it.id,
                timestamp = it.timestamp,
                type = it.type.name,
                identifier = it.identifier,
                ip = it.ip,
                message = it.message,
            )
        }
    }

    @GetMapping("/security-stats")
    fun securityStats(): SecurityStatsDto {
        val s = securityEventService.stats()
        return SecurityStatsDto(
            total = s.total,
            byType = s.byType.mapKeys { it.key.name },
            topIps = s.topIps.map { TopEntryDto(it.first, it.second) },
            topIdentifiers = s.topIdentifiers.map { TopEntryDto(it.first, it.second) },
        )
    }
}
