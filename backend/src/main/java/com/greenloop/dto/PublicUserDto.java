package com.greenloop.dto;

import com.greenloop.model.User;

public record PublicUserDto(
        Long id,
        String username,
        String name,
        String email,
        String role
) {
    public static PublicUserDto from(User u) {
        return new PublicUserDto(
                u.getId(),
                u.getUsername(),
                u.getName(),
                u.getEmail(),
                u.getRole()
        );
    }
}