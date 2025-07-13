package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonValue
import com.paullouis.travelsync.model.generated.Currency
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 
 * @param amount Amount of the expense
 * @param currency 
 */
data class Expense(

    @Schema(example = "150.75", required = true, description = "Amount of the expense")
    @get:JsonProperty("amount", required = true) val amount: kotlin.Double,

    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("currency", required = true) val currency: Currency
) {

}

