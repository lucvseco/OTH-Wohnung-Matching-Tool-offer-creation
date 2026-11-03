package com.housing.oth_nest.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.housing.oth_nest.model.ApartmentType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

import static com.housing.oth_nest.validation.ValidationLimits.*;

@Data
@Schema(description = "Apartment / room details for a listing")
public class ApartmentDto {

    @NotBlank(message = "Please enter a name for your offer.")
    @Size(min = NAME_MIN, max = NAME_MAX, message = "Name must be between {min} and {max} characters.")
    @Pattern(regexp = CONTAINS_LETTER, message = "Name must contain letters.")
    private String title;

    @NotBlank(message = "Please add a description.")
    @Size(min = DESCRIPTION_MIN, max = DESCRIPTION_MAX, message = "Description must be between {min} and {max} characters.")
    private String description;

    //Warmmiete = kaltmiete + nebenkosten
    @NotNull
    @PositiveOrZero
    @DecimalMax(TOTAL_PRICE_MAX)
    @Digits(integer = 5, fraction = 2)
    private Double price;

    @PositiveOrZero
    @DecimalMax(ONE_TIME_PRICE_MAX)
    @Digits(integer = 5, fraction = 2)
    private Double deposit;

    @NotBlank(message = "Please enter the address.")
    @Size(min = ADDRESS_MIN, max = ADDRESS_MAX, message = "Address must be between {min} and {max} characters.")
    @Pattern(regexp = CONTAINS_LETTER_AND_DIGIT,
            message = "Please enter a full address (street, house number, postal code and city).")
    private String location;

    //0 means "not specified", see isAreaRealistic()
    @PositiveOrZero
    @DecimalMax(AREA_MAX)
    @Digits(integer = 4, fraction = 2)
    private Double area;

    @PositiveOrZero
    @DecimalMax(MONTHLY_PRICE_MAX)
    @Digits(integer = 5, fraction = 2)
    private Double kaltmiete;

    @PositiveOrZero
    @DecimalMax(MONTHLY_PRICE_MAX)
    @Digits(integer = 5, fraction = 2)
    private Double nebenkosten;

    @PositiveOrZero
    @DecimalMax(ONE_TIME_PRICE_MAX)
    @Digits(integer = 5, fraction = 2)
    private Double ablose;

    @PositiveOrZero
    @DecimalMax(ONE_TIME_PRICE_MAX)
    @Digits(integer = 5, fraction = 2)
    private Double sonstiges;

    @NotNull
    private ApartmentType apartmentType;

    @Min(0)
    @Max(OCCUPANTS_MAX)
    private Integer totalOccupants;

    @Min(0)
    @Max(OCCUPANTS_MAX)
    private Integer malesCount;

    @Min(0)
    @Max(OCCUPANTS_MAX)
    private Integer femalesCount;

    @Min(0)
    @Max(OCCUPANTS_MAX)
    private Integer diverseCount;

    @Pattern(regexp = PERMISSION, message = "must be one of: allowed, not-allowed, maybe")
    private String petsPermission;

    @Pattern(regexp = PERMISSION, message = "must be one of: allowed, not-allowed, maybe")
    private String smokingPermission;

    @Pattern(regexp = PERMISSION, message = "must be one of: allowed, not-allowed, maybe")
    private String partiesPermission;

    @Pattern(regexp = PERMISSION, message = "must be one of: allowed, not-allowed, maybe")
    private String instrumentsPermission;

    @Pattern(regexp = PERMISSION, message = "must be one of: allowed, not-allowed, maybe")
    private String visitorsPermission;

    private List<String> photoUrls;

    //surrounding whitespace is removed before the length checks run
    public void setTitle(String title) {
        this.title = title == null ? null : title.trim();
    }

    public void setDescription(String description) {
        this.description = description == null ? null : description.trim();
    }

    public void setLocation(String location) {
        this.location = location == null ? null : location.trim();
    }

    @JsonIgnore
    @AssertTrue(message = "Area must be at least " + AREA_MIN + " m² (or 0 if not specified).")
    public boolean isAreaRealistic() {
        return area == null || area == 0 || area >= AREA_MIN;
    }

    @JsonIgnore
    @AssertTrue(message = "price must equal kaltmiete + nebenkosten.")
    public boolean isPriceMatchingBreakdown() {
        if (price == null || kaltmiete == null || nebenkosten == null) {
            return true;
        }
        return Math.abs(price - (kaltmiete + nebenkosten)) < 0.005;
    }

    @JsonIgnore
    @AssertTrue(message = "A WG can have at most " + OCCUPANTS_MAX + " tenants in total.")
    public boolean isOccupantsWithinLimit() {
        return countedOccupants() <= OCCUPANTS_MAX;
    }

    @JsonIgnore
    @AssertTrue(message = "totalOccupants must equal malesCount + femalesCount + diverseCount.")
    public boolean isTotalOccupantsConsistent() {
        if (totalOccupants == null || (malesCount == null && femalesCount == null && diverseCount == null)) {
            return true;
        }
        return totalOccupants == countedOccupants();
    }

    private int countedOccupants() {
        return (malesCount != null ? malesCount : 0)
                + (femalesCount != null ? femalesCount : 0)
                + (diverseCount != null ? diverseCount : 0);
    }
}
