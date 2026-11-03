package com.housing.oth_nest.service;

import com.housing.oth_nest.dto.NotificationResponseDto;
import com.housing.oth_nest.exception.ResourceNotFoundException;
import com.housing.oth_nest.model.Notification;
import com.housing.oth_nest.model.NotificationType;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.repository.NotificationRepository;
import com.housing.oth_nest.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    //create a notification for a user
    @Transactional
    public void createNotification(User recipient, NotificationType type, String title, String message, Long applicationId, Long offerId) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(type)
                .title(title)
                .message(message)
                .applicationId(applicationId)
                .offerId(offerId)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }

    //get all notifications for a user
    public List<NotificationResponseDto> getUserNotifications(Long userId) {
        return notificationRepository.findByRecipient_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToDto)
                .toList();
    }

    //get unread notification count for a user
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByRecipient_IdAndIsReadFalse(userId);
    }

    //mark a notification as read
    @Transactional
    public void markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    //mark all notifications as read for a user
    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository.findByRecipient_IdOrderByCreatedAtDesc(userId)
                .stream().filter(n -> !n.isRead()).toList();
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    //map notification entity to NotificationResponseDto
    private NotificationResponseDto mapToDto(Notification notification) {
        return NotificationResponseDto.builder()
                .id(String.valueOf(notification.getId()))
                .userId(String.valueOf(notification.getRecipient().getId()))
                .type(notification.getType().name().toLowerCase().replace("_", "-"))
                .title(notification.getTitle())
                .message(notification.getMessage())
                .applicationId(notification.getApplicationId() != null ? String.valueOf(notification.getApplicationId()) : null)
                .offerId(notification.getOfferId() != null ? String.valueOf(notification.getOfferId()) : null)
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt().toString())
                .build();
    }
}