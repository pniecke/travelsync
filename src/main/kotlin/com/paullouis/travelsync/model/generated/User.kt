package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import com.paullouis.travelsync.model.generated.UserRole
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
 * @param username Username of the user
 * @param id Unique identifier for the user
 * @param firstName First name of the user
 * @param lastName Last name of the user
 * @param email Email address of the user
 * @param mobile Mobile phone number of the user
 * @param locale Locale of the user
 * @param roles 
 * @param password Password of the user (write-only)
 */
data class User(

    @get:Pattern(regexp="^[A-Za-z0-9._-]+$")
    @get:Size(min=3,max=64)
    @Schema(example = "john_doe", required = true, description = "Username of the user")
    @get:JsonProperty("username", required = true) val username: kotlin.String,

    @Schema(example = "123e4567-e89b-12d3-a456-426614174000", description = "Unique identifier for the user")
    @get:JsonProperty("id") val id: java.util.UUID? = null,

    @get:Size(max=100)
    @Schema(example = "John", description = "First name of the user")
    @get:JsonProperty("firstName") val firstName: kotlin.String? = null,

    @get:Size(max=100)
    @Schema(example = "Doe", description = "Last name of the user")
    @get:JsonProperty("lastName") val lastName: kotlin.String? = null,

    @get:Email
    @get:Size(max=254)
    @Schema(example = "john.doe@sample.ch", description = "Email address of the user")
    @get:JsonProperty("email") val email: kotlin.String? = null,

    @get:Pattern(regexp="^[+0-9 ()-]+$")
    @get:Size(max=32)
    @Schema(example = "+41 79 123 45 67", description = "Mobile phone number of the user")
    @get:JsonProperty("mobile") val mobile: kotlin.String? = null,

    @get:Size(max=16)
    @Schema(example = "en-US", description = "Locale of the user")
    @get:JsonProperty("locale") val locale: kotlin.String? = null,

    @field:Valid
    @get:Size(max=16)
    @Schema(example = "null", description = "")
    @get:JsonProperty("roles") val roles: kotlin.collections.List<UserRole>? = null,

    @get:Size(min=12,max=72)
    @Schema(example = "securepassword", description = "Password of the user (write-only)")
    @get:JsonProperty("password") val password: kotlin.String? = null
    ) {

}

