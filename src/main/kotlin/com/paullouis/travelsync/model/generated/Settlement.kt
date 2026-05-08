package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonValue
import com.paullouis.travelsync.model.generated.Currency
import com.paullouis.travelsync.model.generated.User
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
 * 
 * @param tripId 
 * @param fromUser 
 * @param toUser 
 * @param amount 
 * @param currency 
 * @param settledAt 
 * @param id Unique identifier for the settlement
 * @param note 
 * @param createdAt 
 */
data class Settlement(

    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("tripId", required = true) val tripId: java.util.UUID,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("fromUser", required = true) val fromUser: User,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("toUser", required = true) val toUser: User,

    @get:DecimalMin("0")
    @get:DecimalMax("1000000000")
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("amount", required = true) val amount: kotlin.Double,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("currency", required = true) val currency: Currency,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("settledAt", required = true) val settledAt: java.time.LocalDateTime,

    @Schema(example = "null", description = "Unique identifier for the settlement")
    @get:JsonProperty("id") val id: java.util.UUID? = null,

    @get:Size(max=500)
    @Schema(example = "null", description = "")
    @get:JsonProperty("note") val note: kotlin.String? = null,

    @field:Valid
    @Schema(example = "null", description = "")
    @get:JsonProperty("createdAt") val createdAt: java.time.LocalDateTime? = null
    ) {

}

