package com.housing.oth_nest.service;

import com.housing.oth_nest.dto.DtoMapper;
import com.housing.oth_nest.dto.OfferRequestDto;
import com.housing.oth_nest.dto.OfferResponseDto;
import com.housing.oth_nest.exception.ResourceNotFoundException;
import com.housing.oth_nest.model.Apartment;
import com.housing.oth_nest.model.ApartmentType;
import com.housing.oth_nest.model.Application;
import com.housing.oth_nest.model.ApplicationStatus;
import com.housing.oth_nest.model.Offer;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.repository.ApartmentRepository;
import com.housing.oth_nest.repository.ApplicationRepository;
import com.housing.oth_nest.repository.OfferRepository;
import com.housing.oth_nest.repository.UserRepository;
import com.housing.oth_nest.validation.PhotoValidator;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class OfferService {

    private final OfferRepository offerRepository;
    private final ApartmentRepository apartmentRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final PhotoStorage photoStorage;

    public OfferService(
            OfferRepository offerRepository,
            ApartmentRepository apartmentRepository,
            UserRepository userRepository,
            ApplicationRepository applicationRepository,
            PhotoStorage photoStorage) {
        this.offerRepository = offerRepository;
        this.apartmentRepository = apartmentRepository;
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
        this.photoStorage = photoStorage;
    }

    public List<OfferResponseDto> searchOffers(
            String location,
            Double maxPrice,
            ApartmentType apartmentType,
            Boolean activeOnly,
            Boolean includeRented) {

        boolean active = activeOnly == null || activeOnly;
        boolean withRented = includeRented != null && includeRented;

        Specification<Offer> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("apartment", JoinType.INNER);
                root.fetch("owner", JoinType.LEFT);
            }

            var apartment = root.join("apartment");

            if (active) {
                //rented offers are inactive too, but stay visible when asked for (disabled ones don't)
                Predicate isActive = cb.isTrue(root.get("active"));
                predicates.add(withRented ? cb.or(isActive, rentedPredicate(root, query, cb)) : isActive);
            }
            if (location != null && !location.isBlank()) {
                predicates.add(cb.like(
                        cb.lower(apartment.get("location")),
                        "%" + location.toLowerCase() + "%"));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(apartment.get("price"), maxPrice));
            }
            if (apartmentType != null) {
                predicates.add(cb.equal(apartment.get("apartmentType"), apartmentType));
            }

            query.distinct(true);
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return toResponses(offerRepository.findAll(spec));
    }

    public OfferResponseDto getOfferById(Long id) {
        Offer offer = offerRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found: " + id));
        return DtoMapper.toOfferResponse(offer, isRented(offer.getId()));
    }

    public List<OfferResponseDto> getOffersByOwner(Long ownerId) {
        if (!userRepository.existsById(ownerId)) {
            throw new ResourceNotFoundException("User not found: " + ownerId);
        }
        return toResponses(offerRepository.findByOwner_IdAndActiveTrue(ownerId));
    }

    //an offer is rented once the owner offered it to one of the applicants
    private boolean isRented(Long offerId) {
        return applicationRepository.existsByOffer_IdAndStatus(offerId, ApplicationStatus.OFFERED);
    }

    private static Predicate rentedPredicate(Root<Offer> offer, CriteriaQuery<?> query, CriteriaBuilder cb) {
        Subquery<Long> offered = query.subquery(Long.class);
        Root<Application> application = offered.from(Application.class);
        offered.select(application.get("id"))
                .where(cb.equal(application.get("offer"), offer),
                        cb.equal(application.get("status"), ApplicationStatus.OFFERED));
        return cb.exists(offered);
    }

    //one query for the rented flags of the whole list instead of one per offer
    private List<OfferResponseDto> toResponses(List<Offer> offers) {
        Set<Long> rentedOfferIds = applicationRepository.findOfferIdsByStatus(ApplicationStatus.OFFERED);
        return offers.stream()
                .map(offer -> DtoMapper.toOfferResponse(offer, rentedOfferIds.contains(offer.getId())))
                .toList();
    }

    @Transactional
    public OfferResponseDto createOffer(OfferRequestDto request, List<MultipartFile> files) {
        //reject wrong types, fake images and too many or too large files before anything is written
        List<String> photoExtensions = PhotoValidator.validate(files);

        User owner = userRepository.findById(request.getOwnerId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Owner not found: " + request.getOwnerId()));

        Apartment apartment = DtoMapper.toApartment(request.getApartment());

        //saved into app.uploads.dir, removed again if this transaction rolls back
        apartment.setPhotoUrls(photoStorage.store(files, photoExtensions));
        apartment = apartmentRepository.save(apartment);

        Offer offer = new Offer();
        offer.setApartment(apartment);
        offer.setOwner(owner);
        offer.setAvailableFrom(request.getAvailableFrom());
        offer.setAvailableUntil(request.getAvailableUntil());
        offer.setStayType(request.getStayType());
        offer.setActive(true);

        offer = offerRepository.save(offer);
        return DtoMapper.toOfferResponse(offer, false);
    }

    @Transactional
    public OfferResponseDto deactivateOffer(Long id) {
        Offer offer = offerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found: " + id));
        offer.setActive(false);
        return DtoMapper.toOfferResponse(offerRepository.save(offer), isRented(id));
    }
}