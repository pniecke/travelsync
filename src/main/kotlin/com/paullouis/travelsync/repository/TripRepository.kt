package com.paullouis.travelsync.repository

import com.paullouis.travelsync.entity.TripEntity
import org.springframework.data.repository.CrudRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface TripRepository : CrudRepository<TripEntity, UUID>{
}