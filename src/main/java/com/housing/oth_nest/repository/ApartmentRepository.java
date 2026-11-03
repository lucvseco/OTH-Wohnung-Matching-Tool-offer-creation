package com.housing.oth_nest.repository;

import com.housing.oth_nest.model.Apartment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApartmentRepository extends JpaRepository<Apartment, Long> {
}
