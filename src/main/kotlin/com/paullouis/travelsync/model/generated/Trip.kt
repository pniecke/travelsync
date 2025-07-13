package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonValue
import com.paullouis.travelsync.model.generated.Expense
import com.paullouis.travelsync.model.generated.TripStatus
import com.paullouis.travelsync.model.generated.User
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 
 * @param name Name of the trip
 * @param destination Destination of the trip
 * @param startTime Start time of the trip
 * @param status 
 * @param id Unique identifier for the trip
 * @param participants 
 * @param endTime End time of the trip
 * @param description Description of the trip
 * @param expenses 
 */
data class Trip(

    @Schema(example = "Summer Vacation 2025", required = true, description = "Name of the trip")
    @get:JsonProperty("name", required = true) val name: kotlin.String,

    @Schema(example = "Sardinia, Italy", required = true, description = "Destination of the trip")
    @get:JsonProperty("destination", required = true) val destination: kotlin.String,

    @Schema(example = "2025-07-06T10:00:00", required = true, description = "Start time of the trip")
    @get:JsonProperty("startTime", required = true) val startTime: java.time.LocalDateTime,

    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("status", required = true) val status: TripStatus,

    @Schema(example = "a1b2c3d4-e5f6-7890-1234-567890abcdef", description = "Unique identifier for the trip")
    @get:JsonProperty("id") val id: java.util.UUID? = null,

    @Schema(example = "null", description = "")
    @get:JsonProperty("participants") val participants: kotlin.collections.List<User>? = null,

    @Schema(example = "2025-07-20T18:00:00", description = "End time of the trip")
    @get:JsonProperty("endTime") val endTime: java.time.LocalDateTime? = null,

    @Schema(example = "A relaxing summer vacation in Sardinia.", description = "Description of the trip")
    @get:JsonProperty("description") val description: kotlin.String? = null,

    @Schema(example = "null", description = "")
    @get:JsonProperty("expenses") val expenses: kotlin.collections.List<Expense>? = null
) {

}

