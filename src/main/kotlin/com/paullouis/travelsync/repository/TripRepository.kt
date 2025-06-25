package com.paullouis.travelsync.repository

import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import org.springframework.data.repository.CrudRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface TripRepository : CrudRepository<TripEntity, UUID>{

    fun findByParticipantsContains(user: UserEntity): List<TripEntity>
}