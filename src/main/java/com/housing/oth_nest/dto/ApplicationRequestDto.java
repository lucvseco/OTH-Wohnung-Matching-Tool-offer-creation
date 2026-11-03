package com.housing.oth_nest.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import static com.housing.oth_nest.validation.ValidationLimits.APPLICATION_MESSAGE_MAX;
import static com.housing.oth_nest.validation.ValidationLimits.APPLICATION_MESSAGE_MIN;

@Data
@Schema(description = "Apply to a listing with a message (like WG-Gesucht contact)")
public class ApplicationRequestDto {

    @NotNull
    private Long applicantId;

    @NotNull
    private Long offerId;

    @NotBlank(message = "Please write a short message.")
    @Size(min = APPLICATION_MESSAGE_MIN, max = APPLICATION_MESSAGE_MAX,
            message = "Message must be between {min} and {max} characters.")
    private String message;

    //surrounding whitespace is removed before the length check runs
    public void setMessage(String message) {
        this.message = message == null ? null : message.trim();
    }
}
