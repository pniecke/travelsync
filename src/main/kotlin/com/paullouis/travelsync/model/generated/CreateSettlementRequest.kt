package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonValue
import com.paullouis.travelsync.model.generated.Currency
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
 * @param fromUserId 
 * @param toUserId 
 * @param amount 
 * @param currency 
 * @param note 
 * @param settledAt 
 */
data class CreateSettlementRequest(

    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("fromUserId", required = true) val fromUserId: java.util.UUID,

    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("toUserId", required = true) val toUserId: java.util.UUID,

    @get:DecimalMin("0")
    @get:DecimalMax("1000000000")
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("amount", required = true) val amount: kotlin.Double,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("currency", required = true) val currency: Currency,

    @get:Size(max=500)
    @Schema(example = "null", description = "")
    @get:JsonProperty("note") val note: kotlin.String? = null,

    @field:Valid
    @Schema(example = "null", description = "")
    @get:JsonProperty("settledAt") val settledAt: java.time.LocalDateTime? = null
    ) {

}

