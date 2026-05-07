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
 * @param username Username for the new account
 * @param password Password for the new account
 * @param email Email address for the new account
 */
data class SignUpRequest(

    @get:Pattern(regexp="^[A-Za-z0-9._-]+$")
    @get:Size(min=3,max=64)
    @Schema(example = "new_user", required = true, description = "Username for the new account")
    @get:JsonProperty("username", required = true) val username: kotlin.String,

    @get:Size(min=12,max=72)
    @Schema(example = "securepassword123", required = true, description = "Password for the new account")
    @get:JsonProperty("password", required = true) val password: kotlin.String,

    @get:Email
    @get:Size(max=254)
    @Schema(example = "user@example.com", required = true, description = "Email address for the new account")
    @get:JsonProperty("email", required = true) val email: kotlin.String
    ) {

}

