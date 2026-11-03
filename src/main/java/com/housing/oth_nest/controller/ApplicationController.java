package com.housing.oth_nest.controller;

import com.housing.oth_nest.dto.ApplicationRequestDto;
import com.housing.oth_nest.dto.ApplicationResponseDto;
import com.housing.oth_nest.dto.ApplicationStatusUpdateDto; // ⬅️ Import DTO
import com.housing.oth_nest.service.ApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/applications")
@Tag(name = "application-controller", description = "Apply to listings and view applications")
@CrossOrigin(origins = "http://localhost:5173") //CORS clearance for frontend
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Apply to a listing with a message")
    public ApplicationResponseDto apply(@Valid @RequestBody ApplicationRequestDto request) {
        return applicationService.apply(request);
    }

    //accept or decline application
    @PatchMapping("/{id}/status")
    @Operation(summary = "Approve or decline an application")
    public ApplicationResponseDto updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody ApplicationStatusUpdateDto updateDto) {
        return applicationService.updateApplicationStatus(id, updateDto);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get application by ID")
    public ApplicationResponseDto getApplication(@PathVariable Long id) {
        return applicationService.getApplication(id);
    }

    @GetMapping("/offer/{offerId}")
    @Operation(summary = "List applications for a listing (landlord inbox)")
    public List<ApplicationResponseDto> getApplicationsForOffer(@PathVariable Long offerId) {
        return applicationService.getApplicationsForOffer(offerId);
    }

    @GetMapping("/applicant/{applicantId}")
    @Operation(summary = "List applications sent by a user")
    public List<ApplicationResponseDto> getApplicationsByApplicant(@PathVariable Long applicantId) {
        return applicationService.getApplicationsByApplicant(applicantId);
    }

    //check if a user already applied
    @GetMapping("/has-applied")
    @Operation(summary = "Check if user has already applied for an offer")
    public boolean hasApplied(@RequestParam Long offerId, @RequestParam Long userId) {
        return applicationService.hasUserApplied(offerId, userId);
    }

    @PostMapping("/{id}/finalize-offer")
    @Operation(summary = "Finalize and offer apartment to a specific applicant")
    public void finalizeOffer(@PathVariable Long id) {
        applicationService.finalizeOfferToApplicant(id);
    }
}