package com.housing.oth_nest.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "Student-specific profile fields")
public class StudentProfileDto {

    private String matriculationNumber;
    private String course;
    private Integer semester;
}
