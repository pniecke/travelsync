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
 * @param token Opaque, reusable invite token. Append to the frontend join path to build the shareable link.
 */
data class TripInviteResponse(

    @Schema(example = "k7Qx2f9aZ1pR8sT4uV6wY0bC3dE5gH", required = true, description = "Opaque, reusable invite token. Append to the frontend join path to build the shareable link.")
    @get:JsonProperty("token", required = true) val token: kotlin.String
    ) {

}

