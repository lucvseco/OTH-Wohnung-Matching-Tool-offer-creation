package com.housing.oth_nest.dto;

import com.housing.oth_nest.model.UserRole;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@Schema(description = "Public user profile (no password)")
public class UserResponseDto {

    private Long id;
    private String name;
    private String email;
    private UserRole role;
    private String phoneNumber;
    private String profilePicture;
    private String bio;
    private boolean verified;
    private LocalDateTime createdAt;
    private StudentProfileDto studentProfile;
    private EmployeeProfileDto employeeProfile;
}
