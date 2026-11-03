package com.housing.oth_nest.repository;

import com.housing.oth_nest.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipient_IdOrderByCreatedAtDesc(Long recipientId);
    long countByRecipient_IdAndIsReadFalse(Long recipientId);
}