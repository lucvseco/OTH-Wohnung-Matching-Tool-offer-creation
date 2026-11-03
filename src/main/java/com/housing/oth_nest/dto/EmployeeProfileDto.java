package com.housing.oth_nest.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "Employee-specific profile fields")
public class EmployeeProfileDto {

    private String department;
    private String position;
}
