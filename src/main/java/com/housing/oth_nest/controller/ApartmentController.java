package com.housing.oth_nest.controller;

import com.housing.oth_nest.dto.ApartmentDto;
import com.housing.oth_nest.model.Apartment;
import com.housing.oth_nest.service.ApartmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/apartments")
@Tag(name = "apartment-controller", description = "Apartment details linked to offers")
public class ApartmentController {

    private final ApartmentService apartmentService;

    public ApartmentController(ApartmentService apartmentService) {
        this.apartmentService = apartmentService;
    }

    @GetMapping
    @Operation(summary = "List all apartments")
    public List<Apartment> getApartments() {
        return apartmentService.getAllApartments();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get apartment by ID")
    public Apartment getApartment(@PathVariable Long id) {
        return apartmentService.getApartmentById(id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update apartment details")
    public Apartment updateApartment(
            @PathVariable Long id,
            @Valid @RequestBody ApartmentDto dto) {
        return apartmentService.updateApartment(id, dto);
    }
}
