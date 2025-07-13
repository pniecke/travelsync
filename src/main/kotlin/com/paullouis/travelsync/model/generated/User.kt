package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 
 * @param username Username of the user
 * @param id Unique identifier for the user
 * @param password Password of the user
 * @param firstName First name of the user
 * @param lastName Last name of the user
 * @param email Email address of the user
 * @param mobile Mobile phone number of the user
 * @param locale Locale of the user
 */
data class User(

    @Schema(example = "john_doe", required = true, description = "Username of the user")
    @get:JsonProperty("username", required = true) val username: kotlin.String,

    @Schema(example = "123e4567-e89b-12d3-a456-426614174000", description = "Unique identifier for the user")
    @get:JsonProperty("id") val id: java.util.UUID? = null,

    @Schema(example = "securepassword", description = "Password of the user")
    @get:JsonProperty("password") val password: kotlin.String? = null,

    @Schema(example = "John", description = "First name of the user")
    @get:JsonProperty("firstName") val firstName: kotlin.String? = null,

    @Schema(example = "Doe", description = "Last name of the user")
    @get:JsonProperty("lastName") val lastName: kotlin.String? = null,

    @Schema(example = "john.doe@sample.ch", description = "Email address of the user")
    @get:JsonProperty("email") val email: kotlin.String? = null,

    @Schema(example = "+41 79 123 45 67", description = "Mobile phone number of the user")
    @get:JsonProperty("mobile") val mobile: kotlin.String? = null,

    @Schema(example = "en-US", description = "Locale of the user")
    @get:JsonProperty("locale") val locale: java.util.Locale? = null
) {

}

