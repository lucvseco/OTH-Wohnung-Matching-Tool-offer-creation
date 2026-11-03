package com.housing.oth_nest.repository;

import com.housing.oth_nest.model.Offer;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OfferRepository extends JpaRepository<Offer, Long>, JpaSpecificationExecutor<Offer> {

    @EntityGraph(attributePaths = {"apartment", "owner"})
    List<Offer> findByActiveTrue();

    @EntityGraph(attributePaths = {"apartment", "owner"})
    List<Offer> findByOwner_IdAndActiveTrue(Long ownerId);

    @EntityGraph(attributePaths = {"apartment", "owner"})
    Optional<Offer> findWithDetailsById(Long id);
}