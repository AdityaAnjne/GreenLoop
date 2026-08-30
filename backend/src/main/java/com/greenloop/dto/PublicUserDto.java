package com.greenloop.dto;

import com.greenloop.model.User;

public record PublicUserDto(Long id, String name, String email) {
    public static PublicUserDto from(User u) {
        return new PublicUserDto(u.getId(), u.getName(), u.getEmail());
    }
}