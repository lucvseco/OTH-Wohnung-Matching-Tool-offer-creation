package com.housing.oth_nest.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationResponseDto {
    private String id;
    private String userId;
    private String type;
    private String title;
    private String message;
    private String applicationId;
    private String offerId;
    private boolean isRead;
    private String createdAt;
}