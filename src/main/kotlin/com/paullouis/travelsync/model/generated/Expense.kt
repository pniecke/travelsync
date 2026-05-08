package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonValue
import com.paullouis.travelsync.model.generated.Currency
import com.paullouis.travelsync.model.generated.ExpenseShare
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
 * @param amount Amount of the expense
 * @param currency 
 * @param dateOfExpense Date of the expense
 * @param createdBy 
 * @param tripId Unique identifier of the trip associated with the expense
 * @param id Unique identifier for the expense
 * @param description Description of the expense
 * @param lastModified Last modified date and time of the expense
 * @param paidBy 
 * @param shares Per-participant breakdown of how this expense is split.
 */
data class Expense(

    @get:DecimalMin("0")
    @get:DecimalMax("1000000000")
    @Schema(example = "150.75", required = true, description = "Amount of the expense")
    @get:JsonProperty("amount", required = true) val amount: kotlin.Double,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("currency", required = true) val currency: Currency,

    @field:Valid
    @Schema(example = "2025-07-10T15:30:00", required = true, description = "Date of the expense")
    @get:JsonProperty("dateOfExpense", required = true) val dateOfExpense: java.time.LocalDateTime,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("createdBy", required = true) val createdBy: User,

    @Schema(example = "a1b2c3d4-e5f6-7890-1234-567890abcdef", required = true, description = "Unique identifier of the trip associated with the expense")
    @get:JsonProperty("tripId", required = true) val tripId: java.util.UUID,

    @Schema(example = "a1b2c3d4-e5f6-7890-1234-567890abcdef", description = "Unique identifier for the expense")
    @get:JsonProperty("id") val id: java.util.UUID? = null,

    @get:Size(max=500)
    @Schema(example = "Hotel accommodation", description = "Description of the expense")
    @get:JsonProperty("description") val description: kotlin.String? = null,

    @field:Valid
    @Schema(example = "2025-07-10T15:30:00", description = "Last modified date and time of the expense")
    @get:JsonProperty("lastModified") val lastModified: java.time.LocalDateTime? = null,

    @field:Valid
    @Schema(example = "null", description = "")
    @get:JsonProperty("paidBy") val paidBy: User? = null,

    @field:Valid
    @get:Size(max=100)
    @Schema(example = "null", description = "Per-participant breakdown of how this expense is split.")
    @get:JsonProperty("shares") val shares: kotlin.collections.List<ExpenseShare>? = null
    ) {

}

