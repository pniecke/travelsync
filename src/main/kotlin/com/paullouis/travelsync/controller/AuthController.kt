package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.generated.ChangePasswordRequest
import com.paullouis.travelsync.model.generated.MeResponse
import com.paullouis.travelsync.model.generated.MessageResponse
import com.paullouis.travelsync.model.generated.SignInRequest
import com.paullouis.travelsync.model.generated.SignUpRequest
import com.paullouis.travelsync.service.IDatabaseAuthService
import com.paullouis.travelsync.service.LoginAttemptService
import com.paullouis.travelsync.service.LoginIpThrottle
import com.paullouis.travelsync.service.SignupAttemptService
import com.paullouis.travelsync.service.exception.SignInRateLimitedException
import com.paullouis.travelsync.service.exception.SignUpRateLimitedException
import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.LockedException
import org.springframework.security.web.csrf.CsrfToken
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.context.request.RequestContextHolder
import org.springframework.web.context.request.ServletRequestAttributes

@RestController
class AuthController(
    private val authService: IDatabaseAuthService,
    private val loginAttemptService: LoginAttemptService,
    private val loginIpThrottle: LoginIpThrottle,
    private val signupAttemptService: SignupAttemptService,
) : AuthenticationApi {
    // Endpoints that come from the generated AuthenticationApi (signUp,
    // signIn, logout, changePassword) are mounted by the interface.
    // /auth/csrf and /auth/status are framework plumbing, not part of the
    // public API surface, so they stay as plain controller methods.

    private val logger = LoggerFactory.getLogger(AuthController::class.java)

    override fun signUp(signUpRequest: SignUpRequest): ResponseEntity<MessageResponse> {
        val clientIp = currentRequest().remoteAddr ?: "unknown"

        if (signupAttemptService.isBlocked(clientIp)) {
            val retryAfter = signupAttemptService.retryAfterSeconds(clientIp)
            logger.warn("Sign up blocked - rate limit for IP {} (retry in ${retryAfter}s)", clientIp)
            throw SignUpRateLimitedException(
                retryAfterSeconds = retryAfter,
                message = "Too many signup attempts from this network. Please try again later.",
            )
        }
        signupAttemptService.recordAttempt(clientIp)

        authService.localSignUp(signUpRequest)
        logger.info("User signed up successfully: ${signUpRequest.email}")
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(MessageResponse("Account created successfully"))
    }

    override fun signIn(signInRequest: SignInRequest): ResponseEntity<MeResponse> {
        val attrs = currentAttrs()
        val request = attrs.request
        val response = attrs.response
            ?: throw IllegalStateException("Servlet response not available in current request scope")
        val clientIp = request.remoteAddr ?: "unknown"

        if (loginIpThrottle.isBlocked(clientIp)) {
            val retryAfter = loginIpThrottle.retryAfterSeconds(clientIp)
            logger.warn("Sign in blocked - IP throttle for {} (retry in ${retryAfter}s)", clientIp)
            throw SignInRateLimitedException(
                retryAfterSeconds = retryAfter,
                message = "Too many failed sign-in attempts from this network. Try again later.",
            )
        }

        return try {
            val user = authService.localSignIn(signInRequest, request, response)
            logger.info("User signed in successfully: ${signInRequest.identifier}")
            loginIpThrottle.loginSucceeded(clientIp)
            ResponseEntity.ok(MeResponse(user))
        } catch (e: LockedException) {
            val retryAfter = loginAttemptService.retryAfterSeconds(signInRequest.identifier)
            logger.warn("Sign in blocked - account locked: ${signInRequest.identifier} (retry in ${retryAfter}s)")
            throw SignInRateLimitedException(
                retryAfterSeconds = retryAfter,
                message = e.message ?: "Too many failed attempts. Try again later.",
            )
        } catch (e: BadCredentialsException) {
            logger.warn("Sign in failed - bad credentials: ${signInRequest.identifier}")
            loginIpThrottle.loginFailed(clientIp)
            throw e
        }
    }

    override fun logout(): ResponseEntity<Unit> {
        authService.logout(currentRequest())
        logger.info("User logged out")
        return ResponseEntity.noContent().build()
    }

    override fun changePassword(changePasswordRequest: ChangePasswordRequest): ResponseEntity<Unit> {
        authService.changePassword(changePasswordRequest)
        logger.info("Password changed for current user")
        return ResponseEntity.ok().build()
    }

    @GetMapping("/auth/csrf")
    fun csrf(request: HttpServletRequest): ResponseEntity<Map<String, String>> {
        val token = request.getAttribute(CsrfToken::class.java.name) as? CsrfToken
        return if (token != null) {
            ResponseEntity.ok(
                mapOf(
                    "token" to token.token,
                    "headerName" to token.headerName,
                )
            )
        } else {
            logger.error("CSRF token not available")
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(mapOf("error" to "CSRF token not available"))
        }
    }

    @GetMapping("/auth/status")
    fun status(request: HttpServletRequest): ResponseEntity<Map<String, Boolean>> {
        return ResponseEntity.ok(mapOf("authenticated" to (request.userPrincipal != null)))
    }

    private fun currentAttrs(): ServletRequestAttributes =
        RequestContextHolder.getRequestAttributes() as? ServletRequestAttributes
            ?: throw IllegalStateException("No servlet request bound to current thread")

    private fun currentRequest(): HttpServletRequest = currentAttrs().request
}
