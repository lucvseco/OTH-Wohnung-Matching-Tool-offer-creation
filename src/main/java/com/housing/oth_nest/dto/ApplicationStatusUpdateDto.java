package com.housing.oth_nest.dto;

import com.housing.oth_nest.model.ApplicationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import static com.housing.oth_nest.validation.ValidationLimits.DECLINE_MESSAGE_MAX;

@Data
public class ApplicationStatusUpdateDto {
    @NotNull
    private ApplicationStatus status;

    @Size(max = DECLINE_MESSAGE_MAX, message = "Reason can be at most {max} characters.")
    private String declineMessage;

    //the reason is optional, a blank one is treated as no reason
    public void setDeclineMessage(String declineMessage) {
        this.declineMessage = declineMessage == null || declineMessage.isBlank() ? null : declineMessage.trim();
    }
}
