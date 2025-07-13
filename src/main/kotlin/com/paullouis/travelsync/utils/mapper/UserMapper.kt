package com.paullouis.travelsync.utils.mapper

import com.paullouis.travelsync.entity.UserEntity
import com.paullouis.travelsync.model.generated.User
import org.mapstruct.Mapper
import org.mapstruct.Mapping

@Mapper(componentModel = "spring")
interface UserMapper {

    fun toDto(userEntity: UserEntity): User

    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    fun toEntity(user: User): UserEntity
}