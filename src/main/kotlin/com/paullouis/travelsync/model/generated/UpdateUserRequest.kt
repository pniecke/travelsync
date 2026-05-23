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
 * Partial profile update. All fields optional; only fields present in the request are applied. `id`, `roles`, and `password` are intentionally excluded — `id` is taken from the session, `roles` is admin-only, and password changes go through `/auth/change-password`. 
 * @param username 
 * @param firstName 
 * @param lastName 
 * @param email 
 * @param mobile 
 * @param locale 
 */
data class UpdateUserRequest(

    @get:Pattern(regexp="^[A-Za-z0-9._-]+$")
    @get:Size(min=3,max=64)
    @Schema(example = "john_doe", description = "")
    @get:JsonProperty("username") val username: kotlin.String? = null,

    @get:Size(max=100)
    @Schema(example = "John", description = "")
    @get:JsonProperty("firstName") val firstName: kotlin.String? = null,

    @get:Size(max=100)
    @Schema(example = "Doe", description = "")
    @get:JsonProperty("lastName") val lastName: kotlin.String? = null,

    @get:Email
    @get:Size(max=254)
    @Schema(example = "john.doe@sample.ch", description = "")
    @get:JsonProperty("email") val email: kotlin.String? = null,

    @get:Pattern(regexp="^[+0-9 ()-]*$")
    @get:Size(max=32)
    @Schema(example = "+41 79 123 45 67", description = "")
    @get:JsonProperty("mobile") val mobile: kotlin.String? = null,

    @get:Size(max=16)
    @Schema(example = "en-US", description = "")
    @get:JsonProperty("locale") val locale: kotlin.String? = null
    ) {

}

