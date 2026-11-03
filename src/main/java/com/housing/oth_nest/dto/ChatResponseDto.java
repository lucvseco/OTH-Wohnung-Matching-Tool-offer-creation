package com.housing.oth_nest.dto;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatResponseDto {
    private String id;
    private String applicationId;
    private String applicationStatus;
    private String offerId;
    private String offerTitle;
    private String ownerId;
    private String ownerName;
    private String applicantId;
    private String applicantName;
    private List<ChatMessageResponseDto> messages;
    private long unreadCount;
    private String createdAt;
}