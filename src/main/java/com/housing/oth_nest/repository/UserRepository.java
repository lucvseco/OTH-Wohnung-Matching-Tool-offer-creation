package com.housing.oth_nest.repository;

import com.housing.oth_nest.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = {"studentProfile", "employeeProfile"})
    Optional<User> findWithProfilesById(Long id);
}