package com.paullouis.travelsync.service.exception

/**
 * Subtype of [DuplicateUserException] for the specific case of email collisions.
 * Lets the controller layer log leak-sensitive cases distinctly without changing
 * the user-facing message. Inherits the 409 mapping from its parent.
 */
class DuplicateEmailException(message: String) : DuplicateUserException(message)
