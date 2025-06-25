package com.paullouis.travelsync.repository

import com.paullouis.travelsync.entity.UserEntity
import org.springframework.data.repository.CrudRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface UserRepository : CrudRepository<UserEntity, UUID> {

    fun findByExternalId(externalId: String): UserEntity?
}