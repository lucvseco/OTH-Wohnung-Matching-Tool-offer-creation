package com.housing.oth_nest.dto;

import com.housing.oth_nest.model.StayType;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.OptBoolean;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

import static com.housing.oth_nest.validation.ValidationLimits.YEARS_AHEAD_MAX;

@Data
@Schema(description = "Create a WG-Gesucht style housing offer (apartment + availability)")
public class OfferRequestDto {

    @NotNull
    private Long ownerId;

    @NotNull
    private StayType stayType;

    @Valid
    @NotNull
    private ApartmentDto apartment;

    //strict parsing ("uuuu" + lenient = false) rejects impossible dates like 2026-02-30 instead of rounding them
    @NotNull(message = "Please select a move-in date.")
    @FutureOrPresent(message = "Move-in date cannot be in the past.")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "uuuu-MM-dd", lenient = OptBoolean.FALSE)
    private LocalDate availableFrom;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "uuuu-MM-dd", lenient = OptBoolean.FALSE)
    private LocalDate availableUntil;

    @JsonIgnore
    @AssertTrue(message = "Move-in date must be within the next " + YEARS_AHEAD_MAX + " years.")
    public boolean isAvailableFromWithinLimit() {
        return availableFrom == null || !availableFrom.isAfter(LocalDate.now().plusYears(YEARS_AHEAD_MAX));
    }

    @JsonIgnore
    @AssertTrue(message = "Please select a move-out date for a Zwischenmiete.")
    public boolean isAvailableUntilGivenForSublet() {
        return stayType != StayType.ZWISCHENMIETE || availableUntil != null;
    }

    @JsonIgnore
    @AssertTrue(message = "Move-out date must be after the move-in date.")
    public boolean isAvailableUntilAfterAvailableFrom() {
        return availableFrom == null || availableUntil == null || availableUntil.isAfter(availableFrom);
    }

    @JsonIgnore
    @AssertTrue(message = "A sublet can last at most " + YEARS_AHEAD_MAX + " years.")
    public boolean isSubletWithinLimit() {
        return availableFrom == null || availableUntil == null
                || !availableUntil.isAfter(availableFrom.plusYears(YEARS_AHEAD_MAX));
    }

    //a price of 0 is how the frontend recognises couchsurfing, so only couchsurfing may be free
    @JsonIgnore
    @AssertTrue(message = "Couchsurfing is free, price, kaltmiete and nebenkosten must be 0.")
    public boolean isCouchsurfingFree() {
        if (stayType != StayType.COUCHSURFING || apartment == null) {
            return true;
        }
        return isZeroOrNull(apartment.getPrice())
                && isZeroOrNull(apartment.getKaltmiete())
                && isZeroOrNull(apartment.getNebenkosten());
    }

    @JsonIgnore
    @AssertTrue(message = "Please enter the Kaltmiete (only couchsurfing offers can be free).")
    public boolean isRentGivenForPaidStay() {
        if (stayType == null || stayType == StayType.COUCHSURFING || apartment == null) {
            return true;
        }
        Double rent = apartment.getKaltmiete() != null ? apartment.getKaltmiete() : apartment.getPrice();
        return rent == null || rent > 0; //a missing price is already reported by @NotNull
    }

    private static boolean isZeroOrNull(Double value) {
        return value == null || value == 0;
    }
}
