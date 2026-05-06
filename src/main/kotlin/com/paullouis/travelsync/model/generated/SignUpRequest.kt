package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 
 * @param username Username for the new account
 * @param password Password for the new account
 * @param email Optional email address
 */
data class SignUpRequest(

    @Schema(example = "new_user", required = true, description = "Username for the new account")
    @get:JsonProperty("username", required = true) val username: kotlin.String,

    @Schema(example = "securepassword123", required = true, description = "Password for the new account")
    @get:JsonProperty("password", required = true) val password: kotlin.String,

    @Schema(example = "user@example.com", required = true, description = "Optional email address")
    @get:JsonProperty("email", required = true) val email: kotlin.String
) {

}

