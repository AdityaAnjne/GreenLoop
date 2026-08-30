package com.greenloop.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.greenloop.model.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}
