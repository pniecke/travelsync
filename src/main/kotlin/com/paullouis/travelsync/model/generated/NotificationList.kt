package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import com.paullouis.travelsync.model.generated.Notification
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
 * @param items 
 * @param unreadCount 
 */
data class NotificationList(

    @field:Valid
    @get:Size(max=200)
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("items", required = true) val items: kotlin.collections.List<Notification>,

    @get:Min(0L)
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("unreadCount", required = true) val unreadCount: kotlin.Long
    ) {

}

