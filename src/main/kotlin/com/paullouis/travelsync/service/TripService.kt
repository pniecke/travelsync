package com.paullouis.travelsync.service

import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.model.Trip
import com.paullouis.travelsync.repository.TripRepository
import com.paullouis.travelsync.utils.mapper.TripMapper
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.util.*

@Service
class TripService (
    private final val tripRepository: TripRepository,
    private final val tripMapper: TripMapper
) : ITripService {

    override fun getAllTrips(): List<Trip> {
        val tripEntities: List<TripEntity> = tripRepository.findAll().toList()
        val trips: List<Trip> = tripEntities.map { tripMapper.toDto(it) }
        return trips
    }

    override fun getById(id: UUID): Trip? {
        val tripEntity: TripEntity? = tripRepository.findById(id).orElse(null) // TODO: throw not found exception
        return tripEntity?.let { tripMapper.toDto(it) }
    }

    @Transactional
    override fun createTrip(trip: Trip): Trip {
        var tripEntity: TripEntity = tripMapper.toEntity(trip)
        tripEntity = tripRepository.save(tripEntity)
        return tripMapper.toDto(tripEntity)
    }
}