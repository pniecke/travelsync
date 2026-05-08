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
* How an expense is split among participants
* Values: EQUAL,EXACT,PERCENT
*/
enum class ExpenseShareType(@get:JsonValue val value: kotlin.String) {

    EQUAL("EQUAL"),
    EXACT("EXACT"),
    PERCENT("PERCENT");

    companion object {
        @JvmStatic
        @JsonCreator
        fun forValue(value: kotlin.String): ExpenseShareType {
                return values().first{it -> it.value == value}
        }
    }
}

