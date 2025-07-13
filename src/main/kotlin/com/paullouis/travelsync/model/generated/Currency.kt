package com.paullouis.travelsync.model.generated

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonValue
import com.fasterxml.jackson.annotation.JsonProperty
import io.swagger.v3.oas.annotations.media.Schema

/**
* Currency code for an expense
* Values: CHF,EUR,USD,GBP
*/
enum class Currency(val value: kotlin.String) {

    @JsonProperty("CHF") CHF("CHF"),
    @JsonProperty("EUR") EUR("EUR"),
    @JsonProperty("USD") USD("USD"),
    @JsonProperty("GBP") GBP("GBP")
}

