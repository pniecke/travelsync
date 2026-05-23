package com.paullouis.travelsync

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class TravelSyncApplication

fun main(args: Array<String>) {
	runApplication<TravelSyncApplication>(*args)
}
