package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonValue
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty
import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import jakarta.validation.Valid
import io.swagger.v3.oas.annotations.media.Schema

/**
* Status of the trip
* Values: PLANNED,IN_PROGRESS,COMPLETED,CANCELLED
*/
enum class TripStatus(@get:JsonValue val value: kotlin.String) {

    PLANNED("PLANNED"),
    IN_PROGRESS("IN_PROGRESS"),
    COMPLETED("COMPLETED"),
    CANCELLED("CANCELLED");

    companion object {
        @JvmStatic
        @JsonCreator
        fun forValue(value: kotlin.String): TripStatus {
                return values().first{it -> it.value == value}
        }
    }
}

