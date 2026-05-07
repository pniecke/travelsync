package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import com.paullouis.travelsync.model.generated.User
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
 * @param user 
 */
data class MeResponse(

    @field:Valid
    @Schema(example = "null", description = "")
    @get:JsonProperty("user") val user: User? = null
    ) {

}

