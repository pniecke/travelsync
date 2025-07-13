package com.paullouis.travelsync.controller

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class HealthController : HealthApi {

    override fun getHealth(): ResponseEntity<String> {
        return ResponseEntity.ok("The TravelSync API is up and running")
    }
}