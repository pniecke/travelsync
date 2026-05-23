package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonValue
import com.paullouis.travelsync.model.generated.NotificationType
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
 * @param id 
 * @param type 
 * @param title 
 * @param message 
 * @param read 
 * @param createdAt 
 * @param tripId Trip referenced by this notification, if any
 * @param expenseId Expense referenced by this notification, if any
 * @param actorUserId User who caused the event, if applicable
 */
data class Notification(

    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("id", required = true) val id: java.util.UUID,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("type", required = true) val type: NotificationType,

    @get:Size(max=200)
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("title", required = true) val title: kotlin.String,

    @get:Size(max=1000)
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("message", required = true) val message: kotlin.String,

    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("read", required = true) val read: kotlin.Boolean,

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("createdAt", required = true) val createdAt: java.time.LocalDateTime,

    @Schema(example = "null", description = "Trip referenced by this notification, if any")
    @get:JsonProperty("tripId") val tripId: java.util.UUID? = null,

    @Schema(example = "null", description = "Expense referenced by this notification, if any")
    @get:JsonProperty("expenseId") val expenseId: java.util.UUID? = null,

    @Schema(example = "null", description = "User who caused the event, if applicable")
    @get:JsonProperty("actorUserId") val actorUserId: java.util.UUID? = null
    ) {

}

