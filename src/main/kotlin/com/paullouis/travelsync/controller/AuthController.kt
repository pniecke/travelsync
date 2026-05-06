package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.generated.MeResponse
import com.paullouis.travelsync.model.generated.SignInRequest
import com.paullouis.travelsync.model.generated.SignUpRequest
import com.paullouis.travelsync.service.DatabaseAuthService
import com.paullouis.travelsync.service.DuplicateEmailException
import com.paullouis.travelsync.service.DuplicateUserException
import com.paullouis.travelsync.service.LoginAttemptService
import com.paullouis.travelsync.service.SignupAttemptService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.LockedException
import org.springframework.security.web.csrf.CsrfToken
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("\${api.base-path:/api}/auth")
class AuthController(
    private val authService: DatabaseAuthService,
    private val loginAttemptService: LoginAttemptService,
    private val signupAttemptService: SignupAttemptService,
) {

    private val logger = LoggerFactory.getLogger(AuthController::class.java)

    @PostMapping("/signup")
    fun signUp(
        @RequestBody signUpRequest: SignUpRequest,
        request: HttpServletRequest,
    ): ResponseEntity<Map<String, Any>> {
        val clientIp = request.remoteAddr ?: "unknown"

        if (signupAttemptService.isBlocked(clientIp)) {
            val retryAfter = signupAttemptService.retryAfterSeconds(clientIp)
            logger.warn("Sign up blocked - rate limit for IP {} (retry in ${retryAfter}s)", clientIp)
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, retryAfter.toString())
                .body(mapOf(
                    "error" to "Too many signup attempts from this network. Please try again later.",
                    "retryAfterSeconds" to retryAfter,
                ))
        }

        signupAttemptService.recordAttempt(clientIp)

        return try {
            authService.localSignUp(signUpRequest)
            logger.info("User signed up successfully: ${signUpRequest.email}")
            ResponseEntity.status(HttpStatus.CREATED)
                .body(mapOf("message" to "Account created successfully"))
        } catch (e: DuplicateEmailException) {
            logger.warn("Sign up failed - duplicate email: ${signUpRequest.email}")
            ResponseEntity.status(HttpStatus.CONFLICT)
                .body(mapOf("error" to e.message.orEmpty()))
        } catch (e: DuplicateUserException) {
            logger.warn("Sign up failed - duplicate user: ${signUpRequest.email}")
            ResponseEntity.status(HttpStatus.CONFLICT)
                .body(mapOf("error" to e.message.orEmpty()))
        } catch (e: IllegalArgumentException) {
            logger.warn("Sign up failed - validation error: ${e.message}")
            ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(mapOf("error" to e.message.orEmpty()))
        } catch (e: Exception) {
            logger.error("Sign up failed unexpectedly", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(mapOf("error" to "Registration failed. Please try again."))
        }
    }

    @PostMapping("/signin")
    fun signIn(
        @RequestBody signInRequest: SignInRequest,
        request: HttpServletRequest,
        response: HttpServletResponse
    ): ResponseEntity<Map<String, Any>> {
        return try {
            val user = authService.localSignIn(signInRequest, request, response)
            logger.info("User signed in successfully: ${signInRequest.identifier}")
            ResponseEntity.ok(mapOf(
                "message" to "Login successful",
                "user" to MeResponse(user)
            ))
        } catch (e: LockedException) {
            val retryAfter = loginAttemptService.retryAfterSeconds(signInRequest.identifier)
            logger.warn("Sign in blocked - account locked: ${signInRequest.identifier} (retry in ${retryAfter}s)")
            ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, retryAfter.toString())
                .body(mapOf(
                    "error" to (e.message ?: "Too many failed attempts. Try again later."),
                    "retryAfterSeconds" to retryAfter,
                ))
        } catch (e: BadCredentialsException) {
            logger.warn("Sign in failed - bad credentials: ${signInRequest.identifier}")
            ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(mapOf("error" to (e.message ?: "Invalid credentials")))
        } catch (e: IllegalStateException) {
            logger.warn("Sign in failed - account configuration issue: ${signInRequest.identifier}")
            ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(mapOf("error" to e.message.orEmpty()))
        } catch (e: Exception) {
            logger.error("Sign in failed unexpectedly", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(mapOf("error" to "Login failed. Please try again."))
        }
    }

    @PostMapping("/logout")
    fun logout(request: HttpServletRequest): ResponseEntity<Unit> {
        authService.logout(request)
        logger.info("User logged out successfully")
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/csrf")
    fun csrf(request: HttpServletRequest): ResponseEntity<Map<String, String>> {
        val token = request.getAttribute(CsrfToken::class.java.name) as? CsrfToken
        return if (token != null) {
            ResponseEntity.ok(
                mapOf(
                    "token" to token.token,
                    "headerName" to token.headerName
                )
            )
        } else {
            logger.error("CSRF token not available")
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(mapOf("error" to "CSRF token not available"))
        }
    }

    @GetMapping("/status")
    fun status(request: HttpServletRequest): ResponseEntity<Map<String, Boolean>> {
        val isAuthenticated = request.userPrincipal != null
        return ResponseEntity.ok(mapOf("authenticated" to isAuthenticated))
    }
}

