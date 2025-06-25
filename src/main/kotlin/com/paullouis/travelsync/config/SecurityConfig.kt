package com.paullouis.travelsync.config

import com.paullouis.travelsync.service.CustomOidcUserService
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.web.cors.CorsConfiguration

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val customOidcUserService: CustomOidcUserService,
    private val successHandler: AuthenticationSuccessHandler
) {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/api/user/me").authenticated()
                    .anyRequest().permitAll()
            }
            .oauth2Login { oauth2 ->
                oauth2
                    .loginPage("/oauth2/authorization/google") // entry page
                    .userInfoEndpoint { userInfo -> // map Google's ID token -> OidcUser
                        userInfo.oidcUserService(customOidcUserService)
                    }
                    .successHandler(successHandler) // handle post-login
            }
            .csrf { csrf -> csrf.disable() }
            .sessionManagement { sess ->
                sess.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
            }
            .cors { cors ->
                cors.configurationSource {
                    CorsConfiguration().apply {
                        allowedOrigins = listOf("http://localhost:3030")
                        allowedMethods = listOf("GET", "POST", "PUT", "DELETE")
                        allowCredentials = true
                        allowedHeaders = listOf("*")
                    }
                }
            }
        return http.build()
    }
}