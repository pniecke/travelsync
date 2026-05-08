package com.paullouis.travelsync.service

import com.paullouis.travelsync.model.generated.ChangePasswordRequest
import com.paullouis.travelsync.model.generated.SignInRequest
import com.paullouis.travelsync.model.generated.SignUpRequest
import com.paullouis.travelsync.model.generated.User
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse

interface IDatabaseAuthService {

    fun localSignUp(signUpRequest: SignUpRequest): User

    fun localSignIn(
        signInRequest: SignInRequest,
        servletRequest: HttpServletRequest,
        servletResponse: HttpServletResponse
    ): User

    fun logout(servletRequest: HttpServletRequest)

    fun changePassword(changePasswordRequest: ChangePasswordRequest)
}
