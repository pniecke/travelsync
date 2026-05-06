package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 
 * @param email Email address for authentication
 * @param password Password for authentication
 */
data class SignInRequest(

    @Schema(example = "existing@user.ch", required = true, description = "Email address for authentication")
    @get:JsonProperty("email", required = true) val email: kotlin.String,

    @Schema(example = "securepassword123", required = true, description = "Password for authentication")
    @get:JsonProperty("password", required = true) val password: kotlin.String
) {

}

