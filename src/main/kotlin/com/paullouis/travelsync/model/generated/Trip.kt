package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonValue
import com.paullouis.travelsync.model.generated.Expense
import com.paullouis.travelsync.model.generated.TripStatus
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
 * @param participants 
 * @param destination Destination of the trip
 * @param startTime Start time of the trip
 * @param status 
 * @param id Unique identifier for the trip
 * @param name Name of the trip
 * @param endTime End time of the trip
 * @param description Description of the trip
 * @param createdById Id of the user who created the trip; null for trips created before this field existed
 * @param expenses 
 */
data class Trip(

    @field:Valid
    @get:Size(max=100)
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("participants", required = true) val participants: kotlin.collections.List<User>,

    @get:Size(min=1,max=200)
    @Schema(example = "Sardinia, Italy", required = true, description = "Destination of the trip")
    @get:JsonProperty("destination", required = true) val destination: kotlin.String,

    @field:Valid
    @Schema(example = "2025-07-06T10:00:00", required = true, description = "Start time of the trip")
    @get:JsonProperty("startTime", required = true) val startTime: java.time.LocalDateTime,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("status", required = true) val status: TripStatus,

    @Schema(example = "a1b2c3d4-e5f6-7890-1234-567890abcdef", description = "Unique identifier for the trip")
    @get:JsonProperty("id") val id: java.util.UUID? = null,

    @get:Size(min=1,max=120)
    @Schema(example = "Summer Vacation 2025", description = "Name of the trip")
    @get:JsonProperty("name") val name: kotlin.String? = null,

    @field:Valid
    @Schema(example = "2025-07-20T18:00:00", description = "End time of the trip")
    @get:JsonProperty("endTime") val endTime: java.time.LocalDateTime? = null,

    @get:Size(max=2000)
    @Schema(example = "A relaxing summer vacation in Sardinia.", description = "Description of the trip")
    @get:JsonProperty("description") val description: kotlin.String? = null,

    @Schema(example = "null", readOnly = true, description = "Id of the user who created the trip; null for trips created before this field existed")
    @get:JsonProperty("createdById") val createdById: java.util.UUID? = null,

    @field:Valid
    @get:Size(max=1000)
    @Schema(example = "null", description = "")
    @get:JsonProperty("expenses") val expenses: kotlin.collections.List<Expense>? = null
    ) {

}

