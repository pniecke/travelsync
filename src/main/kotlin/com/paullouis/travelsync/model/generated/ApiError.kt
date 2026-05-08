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
 * Generic error envelope returned by failing endpoints.
 * @param error Human-readable error message safe to display to the user
 * @param retryAfterSeconds For 429 responses: seconds the client should wait before retrying. Mirrors the value of the `Retry-After` header. 
 */
data class ApiError(

    @Schema(example = "An account with that email already exists. Please sign in instead.", required = true, description = "Human-readable error message safe to display to the user")
    @get:JsonProperty("error", required = true) val error: kotlin.String,

    @Schema(example = "600", description = "For 429 responses: seconds the client should wait before retrying. Mirrors the value of the `Retry-After` header. ")
    @get:JsonProperty("retryAfterSeconds") val retryAfterSeconds: kotlin.Long? = null
    ) {

}

