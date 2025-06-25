package com.paullouis.travelsync.config

import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler
import org.springframework.stereotype.Component

@Component
class SpaAuthenticationSuccessHandler : SimpleUrlAuthenticationSuccessHandler() {
    init {
        // after login, always redirect here
        defaultTargetUrl = "http://localhost:3030/dashboard"
        isAlwaysUseDefaultTargetUrl = true
    }
}