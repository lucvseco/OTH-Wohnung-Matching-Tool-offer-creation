package com.housing.oth_nest.repository;

import com.housing.oth_nest.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    //automatically orders messages chronologically
    List<ChatMessage> findByChat_IdOrderBySentAtAsc(Long chatId);
    //finds unread messages received
    List<ChatMessage> findByChat_IdAndSender_IdNotAndIsReadFalse(Long chatId, Long currentUserId);
    //counts unread messages for badges
    long countByChat_IdAndSender_IdNotAndIsReadFalse(Long chatId, Long currentUserId);
}