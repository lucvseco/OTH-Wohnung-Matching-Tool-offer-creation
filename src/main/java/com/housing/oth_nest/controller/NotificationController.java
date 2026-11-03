package com.housing.oth_nest.controller;

import com.housing.oth_nest.dto.NotificationResponseDto;
import com.housing.oth_nest.service.NotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

//notification-related endpoints: retrieve notifications, check unread counts, mark notifications as read
@RestController
@RequestMapping("/notifications")
@CrossOrigin(origins = "http://localhost:5173")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    //get all notifications for a user
    @GetMapping("/user/{userId}")
    public List<NotificationResponseDto> getUserNotifications(@PathVariable Long userId) {
        return notificationService.getUserNotifications(userId);
    }

    //get count of unread notifications for a user
    @GetMapping("/user/{userId}/unread-count")
    public long getUnreadCount(@PathVariable Long userId) {
        return notificationService.getUnreadCount(userId);
    }

    //mark a specific notification as read
    @PatchMapping("/{id}/read")
    public void markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
    }

    //mark all notifications for a user as read
    @PatchMapping("/user/{userId}/read-all")
    public void markAllAsRead(@PathVariable Long userId) {
        notificationService.markAllAsRead(userId);
    }
}