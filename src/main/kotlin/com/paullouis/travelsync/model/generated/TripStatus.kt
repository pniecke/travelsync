package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonValue
import com.fasterxml.jackson.annotation.JsonProperty
import io.swagger.v3.oas.annotations.media.Schema

/**
* Status of the trip
* Values: PLANNED,IN_PROGRESS,COMPLETED,CANCELLED
*/
enum class TripStatus(val value: kotlin.String) {

    @JsonProperty("PLANNED") PLANNED("PLANNED"),
    @JsonProperty("IN_PROGRESS") IN_PROGRESS("IN_PROGRESS"),
    @JsonProperty("COMPLETED") COMPLETED("COMPLETED"),
    @JsonProperty("CANCELLED") CANCELLED("CANCELLED")
}

