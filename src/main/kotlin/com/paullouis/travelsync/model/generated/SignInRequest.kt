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
 * @param identifier Email address or username for authentication
 * @param password Password for authentication
 */
data class SignInRequest(

    @get:Size(min=3,max=254)
    @Schema(example = "existing@user.ch", required = true, description = "Email address or username for authentication")
    @get:JsonProperty("identifier", required = true) val identifier: kotlin.String,

    @get:Size(min=1,max=72)
    @Schema(example = "securepassword123", required = true, description = "Password for authentication")
    @get:JsonProperty("password", required = true) val password: kotlin.String
    ) {

}

