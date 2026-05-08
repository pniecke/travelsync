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
 * @param user 
 * @param currency 
 * @param net Net balance for this user in this currency: positive = is owed money; negative = owes money. 
 */
data class UserBalance(

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("user", required = true) val user: User,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("currency", required = true) val currency: Currency,

    @Schema(example = "null", required = true, description = "Net balance for this user in this currency: positive = is owed money; negative = owes money. ")
    @get:JsonProperty("net", required = true) val net: kotlin.Double
    ) {

}

