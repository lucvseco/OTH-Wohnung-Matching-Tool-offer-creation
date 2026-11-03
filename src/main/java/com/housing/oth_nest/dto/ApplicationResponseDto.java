package com.housing.oth_nest.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationResponseDto {
    private String id;
    private String offerId;
    private String offerTitle;
    private String applicantId;
    private String applicantName;
    private String applicantEmail;
    private String message;
    private String status;
    private String declineMessage;
    private String createdAt;
}