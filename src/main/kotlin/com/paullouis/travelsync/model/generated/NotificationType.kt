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
* Kind of in-app notification.
* Values: EXPENSE_INVOLVING_YOU,ADDED_TO_TRIP,TRIP_STARTED
*/
enum class NotificationType(@get:JsonValue val value: kotlin.String) {

    EXPENSE_INVOLVING_YOU("EXPENSE_INVOLVING_YOU"),
    ADDED_TO_TRIP("ADDED_TO_TRIP"),
    TRIP_STARTED("TRIP_STARTED");

    companion object {
        @JvmStatic
        @JsonCreator
        fun forValue(value: kotlin.String): NotificationType {
                return values().first{it -> it.value == value}
        }
    }
}

