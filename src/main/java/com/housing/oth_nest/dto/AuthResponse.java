package com.housing.oth_nest.dto;

import com.housing.oth_nest.model.UserRole;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "Successful login or registration response")
public class AuthResponse {

    private Long userId;
    private String name;
    private String email;
    private UserRole role;
    private String message;
}
