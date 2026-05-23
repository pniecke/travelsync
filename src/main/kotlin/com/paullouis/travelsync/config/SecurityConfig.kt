package com.paullouis.travelsync.config

import com.paullouis.travelsync.service.CustomOidcUserService
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.dao.DaoAuthenticationProvider
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler
import org.springframework.security.web.util.matcher.AntPathRequestMatcher.antMatcher
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val customOidcUserService: CustomOidcUserService,
    private val userDetailsService: UserDetailsService,
    @Value("\${app.frontend.url:http://localhost:3000}")
    private val frontendUrl: String,
    @Value("\${server.servlet.session.cookie.secure:false}")
    private val cookieSecure: Boolean,
    @Value("\${spring.h2.console.enabled:false}")
    private val h2ConsoleEnabled: Boolean,
) {

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun authenticationProvider(): DaoAuthenticationProvider =
        DaoAuthenticationProvider(userDetailsService).apply {
            setPasswordEncoder(passwordEncoder())
        }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration()
        configuration.allowedOrigins = listOf(frontendUrl)
        configuration.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
        configuration.allowedHeaders = listOf("*")
        configuration.exposedHeaders = listOf("X-XSRF-TOKEN")
        configuration.allowCredentials = true
        configuration.maxAge = 3600L // Cache preflight requests for 1 hour
        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", configuration)
        return source
    }

    @Bean
    fun authenticationManager(config: AuthenticationConfiguration): AuthenticationManager =
        config.authenticationManager

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        // Create OAuth2 success handler inline
        val oauth2SuccessHandler = SimpleUrlAuthenticationSuccessHandler().apply {
            setDefaultTargetUrl(frontendUrl)
            setAlwaysUseDefaultTargetUrl(true)
        }

        http
            .authorizeHttpRequests { auth ->
                // Use AntPathRequestMatcher explicitly. With both the H2 console
                // servlet and the DispatcherServlet (mounted at /api/*) present,
                // String-only matchers cannot decide which servlet they target.
                auth
                    .requestMatchers(antMatcher("/h2-console/**")).permitAll()
                    .requestMatchers(antMatcher("/api/health")).permitAll()
                    .requestMatchers(antMatcher("/api/auth/signup")).permitAll()
                    .requestMatchers(antMatcher("/api/auth/signin")).permitAll()
                    .requestMatchers(antMatcher("/api/auth/csrf")).permitAll()
                    .requestMatchers(antMatcher("/api/admin/**")).hasRole("ADMIN")
                    .requestMatchers(antMatcher("/api/**")).authenticated()
                    .anyRequest().permitAll()
            }
            .headers { headers ->
                headers
                    .frameOptions { fo ->
                        // The H2 console requires same-origin framing. Production
                        // (h2 console disabled) hardens to DENY.
                        if (h2ConsoleEnabled) fo.sameOrigin() else fo.deny()
                    }
                    .xssProtection { it.disable() } // Modern browsers have this built-in
                    .contentTypeOptions { } // X-Content-Type-Options: nosniff
                    .contentSecurityPolicy { csp ->
                        // The backend serves JSON; the only HTML it emits is Spring
                        // error pages (and the H2 console in dev). Lock everything
                        // down to same-origin and forbid framing.
                        val frameAncestors = if (h2ConsoleEnabled) "'self'" else "'none'"
                        csp.policyDirectives(
                            "default-src 'self'; " +
                                "script-src 'self'; " +
                                "style-src 'self' 'unsafe-inline'; " +
                                "img-src 'self' data:; " +
                                "font-src 'self' data:; " +
                                "connect-src 'self'; " +
                                "object-src 'none'; " +
                                "base-uri 'self'; " +
                                "form-action 'self'; " +
                                "frame-ancestors $frameAncestors"
                        )
                    }
                    .httpStrictTransportSecurity { hsts ->
                        hsts
                            .includeSubDomains(true)
                            .maxAgeInSeconds(31536000)
                            .preload(true)
                    }
            }
            .oauth2Login { oauth2 ->
                oauth2
                    // Relocate OAuth2 endpoints under /api so they share the
                    // dispatcher servlet (spring.mvc.servlet.path=/api) and
                    // are reached by the Spring Security filter chain.
                    .authorizationEndpoint { it.baseUri("/api/oauth2/authorization") }
                    .redirectionEndpoint { it.baseUri("/api/login/oauth2/code/*") }
                    .loginPage("/api/oauth2/authorization/google")
                    .userInfoEndpoint { u -> u.oidcUserService(customOidcUserService) }
                    .successHandler(oauth2SuccessHandler)
                    .failureUrl("$frontendUrl/login?error=oauth_failed")
            }
            .logout { logout ->
                logout
                    .logoutUrl("/api/auth/logout")
                    .logoutSuccessHandler(HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
                    .invalidateHttpSession(true)
                    .deleteCookies("JSESSIONID", "XSRF-TOKEN")
                    .clearAuthentication(true)
            }
            .csrf { csrf ->
                val tokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse().apply {
                    setCookieName("XSRF-TOKEN")
                    setHeaderName("X-XSRF-TOKEN")
                    setCookiePath("/")
                    // When `cookieSecure` is true (production), force the Secure flag.
                    // When false (dev), leave it null so the cookie follows request.isSecure()
                    // and works over plain HTTP.
                    setSecure(if (cookieSecure) true else null)
                }
                val requestHandler = CsrfTokenRequestAttributeHandler()
                requestHandler.setCsrfRequestAttributeName(null)
                csrf
                    .csrfTokenRepository(tokenRepository)
                    .csrfTokenRequestHandler(requestHandler)
                    .ignoringRequestMatchers(antMatcher("/h2-console/**"))
            }
            .sessionManagement { session ->
                session
                    .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                    .sessionFixation().migrateSession()
                    .maximumSessions(3)
                    .maxSessionsPreventsLogin(false)
            }
            .cors { cors ->
                cors.configurationSource(corsConfigurationSource())
            }
            .exceptionHandling { exceptions ->
                exceptions
                    .authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            }
        return http.build()
    }
}