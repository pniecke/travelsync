package com.paullouis.travelsync.config

import com.fasterxml.jackson.annotation.JsonProperty
import com.paullouis.travelsync.model.generated.User
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class JacksonConfig {

    @Bean
    fun userPasswordMixinCustomizer(): Jackson2ObjectMapperBuilderCustomizer =
        Jackson2ObjectMapperBuilderCustomizer { builder ->
            builder.mixIn(User::class.java, UserPasswordMixin::class.java)
        }

    abstract class UserPasswordMixin {
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
        abstract fun getPassword(): String?
    }
}
