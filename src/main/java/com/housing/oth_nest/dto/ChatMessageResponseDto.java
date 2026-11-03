package com.housing.oth_nest.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class ChatMessageResponseDto {
    private String id;
    private String chatId;
    private String senderId;
    private String senderName;
    private String content;
    @JsonProperty("isRead")
    private boolean isRead;
    private String sentAt;
}