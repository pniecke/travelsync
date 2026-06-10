package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonValue
import com.paullouis.travelsync.model.generated.TripStatus
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
 * @param destination 
 * @param status 
 * @param participantCount Number of people currently on the trip
 * @param alreadyParticipant True if the current user is already on this trip
 * @param name Name of the trip, if set
 * @param startTime 
 * @param endTime 
 * @param invitedByName Display name of the trip creator, if known
 */
data class TripInvitePreview(

    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("tripId", required = true) val tripId: java.util.UUID,

    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("destination", required = true) val destination: kotlin.String,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("status", required = true) val status: TripStatus,

    @Schema(example = "null", required = true, description = "Number of people currently on the trip")
    @get:JsonProperty("participantCount", required = true) val participantCount: kotlin.Int,

    @Schema(example = "null", required = true, description = "True if the current user is already on this trip")
    @get:JsonProperty("alreadyParticipant", required = true) val alreadyParticipant: kotlin.Boolean,

    @Schema(example = "null", description = "Name of the trip, if set")
    @get:JsonProperty("name") val name: kotlin.String? = null,

    @field:Valid
    @Schema(example = "null", description = "")
    @get:JsonProperty("startTime") val startTime: java.time.LocalDateTime? = null,

    @field:Valid
    @Schema(example = "null", description = "")
    @get:JsonProperty("endTime") val endTime: java.time.LocalDateTime? = null,

    @Schema(example = "null", description = "Display name of the trip creator, if known")
    @get:JsonProperty("invitedByName") val invitedByName: kotlin.String? = null
    ) {

}

