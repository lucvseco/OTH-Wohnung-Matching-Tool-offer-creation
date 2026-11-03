package com.housing.oth_nest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import static com.housing.oth_nest.validation.ValidationLimits.CHAT_MESSAGE_MAX;

@Data
public class SendMessageRequestDto {
    @NotNull
    private Long senderId;

    @NotBlank(message = "Message cannot be empty.")
    @Size(max = CHAT_MESSAGE_MAX, message = "Message can be at most {max} characters.")
    private String content;

    public void setContent(String content) {
        this.content = content == null ? null : content.trim();
    }
}
