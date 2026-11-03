package com.housing.oth_nest.dto;

import com.housing.oth_nest.model.ApartmentType;
import com.housing.oth_nest.model.StayType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@Schema(description = "Housing offer listing shown in search results")
public class OfferResponseDto {

    private Long id;
    private boolean active;
    @Schema(description = "The apartment was given to an applicant (inactive offers that are not rented were disabled by the owner)")
    private boolean rented;
    private StayType stayType;
    private LocalDate availableFrom;
    private LocalDate availableUntil;
    private LocalDateTime createdAt;

    private Long apartmentId;
    private String title;
    private String description;
    private Double price;
    private Double deposit;
    private String location;
    private Double area;
    private Double kaltmiete;
    private Double nebenkosten;
    private Double ablose;
    private Double sonstiges;

    private ApartmentType apartmentType;
    private Integer totalOccupants;
    private Integer malesCount;
    private Integer femalesCount;
    private Integer diverseCount;

    private String petsPermission;
    private String smokingPermission;
    private String partiesPermission;
    private String instrumentsPermission;
    private String visitorsPermission;

    private List<String> photoUrls;

    private Long ownerId;
    private String ownerName;
    private String ownerEmail;
}