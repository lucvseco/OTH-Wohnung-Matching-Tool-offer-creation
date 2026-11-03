package com.housing.oth_nest.repository;

import com.housing.oth_nest.model.Application;
import com.housing.oth_nest.model.ApplicationStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    @EntityGraph(attributePaths = {"offer", "offer.apartment", "applicant"})
    Optional<Application> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"offer", "offer.apartment", "applicant"})
    List<Application> findByOffer_Id(Long offerId);

    @EntityGraph(attributePaths = {"offer", "offer.apartment", "applicant"})
    List<Application> findByApplicant_Id(Long applicantId);

    boolean existsByOffer_IdAndApplicant_Id(Long offerId, Long applicantId);

    boolean existsByOffer_IdAndStatus(Long offerId, ApplicationStatus status);

    //ids of all offers with an application in the given status, OFFERED = the apartment is rented
    @Query("select distinct a.offer.id from Application a where a.status = :status")
    Set<Long> findOfferIdsByStatus(@Param("status") ApplicationStatus status);
}
