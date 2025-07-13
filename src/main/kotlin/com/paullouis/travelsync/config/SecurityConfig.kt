package com.paullouis.travelsync.config

import com.paullouis.travelsync.service.CustomOidcUserService
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import org.springframework.web.cors.CorsConfiguration

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val successHandler: AuthenticationSuccessHandler,
    private val customOidcUserService: CustomOidcUserService
) {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/h2-console/**").permitAll()
                    .requestMatchers("/api/health").permitAll()
                    .requestMatchers("/api/**").authenticated()
                    .anyRequest().permitAll()
            }
            .headers { headers ->
                headers.frameOptions { frameOptions ->
                    frameOptions.sameOrigin()
                }
            }
            .oauth2Login { oauth2 ->
                oauth2
                    .loginPage("/oauth2/authorization/google") // entry page
                    .userInfoEndpoint { u -> u.oidcUserService(customOidcUserService) }
                    .successHandler(successHandler) // handle post-login
            }
            .csrf { it.ignoringRequestMatchers("/h2-console/**", "/api/**") }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED) }
            .cors { cors ->
                cors.configurationSource {
                    CorsConfiguration().apply {
                        allowedOrigins = listOf("http://localhost:3000")
                        allowedMethods = listOf("GET", "POST", "PUT", "DELETE")
                        allowCredentials = true
                        allowedHeaders = listOf("*")
                    }
                }
            }
            .exceptionHandling { exceptions ->
                exceptions
                    .authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            }
        return http.build()
    }
}