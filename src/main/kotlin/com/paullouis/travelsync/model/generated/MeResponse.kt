package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import com.paullouis.travelsync.model.generated.User
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 
 * @param user 
 */
data class MeResponse(

    @Schema(example = "null", description = "")
    @get:JsonProperty("user") val user: User? = null
) {

}

