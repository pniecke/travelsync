package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonValue
import com.fasterxml.jackson.annotation.JsonProperty
import io.swagger.v3.oas.annotations.media.Schema

/**
* Role of the user
* Values: USER,ADMIN
*/
enum class UserRole(val value: kotlin.String) {

    @JsonProperty("USER") USER("USER"),
    @JsonProperty("ADMIN") ADMIN("ADMIN")
}

