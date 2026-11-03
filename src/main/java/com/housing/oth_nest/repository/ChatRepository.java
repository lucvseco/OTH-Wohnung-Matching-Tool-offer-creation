package com.housing.oth_nest.repository;

import com.housing.oth_nest.model.Chat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRepository extends JpaRepository<Chat, Long> {
    //finds chats where the user is either the listing owner or the applicant
    List<Chat> findByOwner_IdOrApplicant_IdOrderByCreatedAtDesc(Long ownerId, Long applicantId);
    Optional<Chat> findByApplication_Id(Long applicationId);
    boolean existsByApplication_Id(Long applicationId);
}