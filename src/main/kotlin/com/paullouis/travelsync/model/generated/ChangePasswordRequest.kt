package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
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
 * @param currentPassword The current password of the user
 * @param newPassword The new password for the user
 */
data class ChangePasswordRequest(

    @get:Size(min=1,max=72)
    @Schema(example = "null", required = true, description = "The current password of the user")
    @get:JsonProperty("currentPassword", required = true) val currentPassword: kotlin.String,

    @get:Size(min=12,max=72)
    @Schema(example = "null", required = true, description = "The new password for the user")
    @get:JsonProperty("newPassword", required = true) val newPassword: kotlin.String
    ) {

}

