package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonValue
import com.paullouis.travelsync.model.generated.ExpenseShareType
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
 * @param amount Absolute amount this user owes for the expense
 * @param shareType 
 * @param id Unique identifier for the share
 * @param shareValue Percent value when shareType=PERCENT (0-100); null otherwise. 
 */
data class ExpenseShare(

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("user", required = true) val user: User,

    @get:DecimalMin("0")
    @get:DecimalMax("1000000000")
    @Schema(example = "50.0", required = true, description = "Absolute amount this user owes for the expense")
    @get:JsonProperty("amount", required = true) val amount: kotlin.Double,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("shareType", required = true) val shareType: ExpenseShareType,

    @Schema(example = "null", description = "Unique identifier for the share")
    @get:JsonProperty("id") val id: java.util.UUID? = null,

    @get:DecimalMin("0")
    @Schema(example = "25.0", description = "Percent value when shareType=PERCENT (0-100); null otherwise. ")
    @get:JsonProperty("shareValue") val shareValue: kotlin.Double? = null
    ) {

}

