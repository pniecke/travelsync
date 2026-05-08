package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import com.paullouis.travelsync.model.generated.SuggestedSettlement
import com.paullouis.travelsync.model.generated.UserBalance
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
 * @param balances 
 * @param suggestedSettlements 
 */
data class TripBalances(

    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("tripId", required = true) val tripId: java.util.UUID,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("balances", required = true) val balances: kotlin.collections.List<UserBalance>,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("suggestedSettlements", required = true) val suggestedSettlements: kotlin.collections.List<SuggestedSettlement>
    ) {

}

