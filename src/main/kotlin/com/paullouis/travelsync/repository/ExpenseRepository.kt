package com.paullouis.travelsync.repository

import com.paullouis.travelsync.entity.ExpenseEntity
import com.paullouis.travelsync.entity.TripEntity
import com.paullouis.travelsync.entity.UserEntity
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.CrudRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface ExpenseRepository : CrudRepository<ExpenseEntity, UUID> {

    fun findAllByCreatedByAndPaidBy(createdBy: UserEntity, paidBy: UserEntity): List<ExpenseEntity>

    fun findAllByCreatedBy(user: UserEntity): List<ExpenseEntity>

    fun findAllByPaidBy(user: UserEntity): List<ExpenseEntity>

    @Query(
        """
        select distinct e from ExpenseEntity e
        left join fetch e.shares
        where e.trip = :trip
    """
    )
    fun findAllByTripWithShares(trip: TripEntity): List<ExpenseEntity>
}