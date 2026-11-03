package com.housing.oth_nest.service;

import com.housing.oth_nest.dto.ApartmentDto;
import com.housing.oth_nest.exception.ResourceNotFoundException;
import com.housing.oth_nest.model.Apartment;
import com.housing.oth_nest.repository.ApartmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ApartmentService {

    private final ApartmentRepository apartmentRepository;

    public ApartmentService(ApartmentRepository apartmentRepository) {
        this.apartmentRepository = apartmentRepository;
    }

    public List<Apartment> getAllApartments() {
        return apartmentRepository.findAll();
    }

    public Apartment getApartmentById(Long id) {
        return apartmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found: " + id));
    }

    @Transactional
    public Apartment updateApartment(Long id, ApartmentDto dto) {
        Apartment apartment = getApartmentById(id);
        apartment.setTitle(dto.getTitle());
        apartment.setDescription(dto.getDescription());
        apartment.setPrice(dto.getPrice());
        apartment.setDeposit(dto.getDeposit());
        apartment.setLocation(dto.getLocation());
        apartment.setApartmentType(dto.getApartmentType());
        apartment.setTotalOccupants(dto.getTotalOccupants());
        if (dto.getPhotoUrls() != null) {
            apartment.setPhotoUrls(dto.getPhotoUrls());
        }
        return apartmentRepository.save(apartment);
    }
}
