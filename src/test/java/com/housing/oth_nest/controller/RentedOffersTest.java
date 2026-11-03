package com.housing.oth_nest.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.housing.oth_nest.model.Apartment;
import com.housing.oth_nest.model.ApartmentType;
import com.housing.oth_nest.model.Application;
import com.housing.oth_nest.model.ApplicationStatus;
import com.housing.oth_nest.model.Offer;
import com.housing.oth_nest.model.StayType;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.model.UserRole;
import com.housing.oth_nest.repository.ApplicationRepository;
import com.housing.oth_nest.repository.OfferRepository;
import com.housing.oth_nest.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

//full application on the in-memory H2 profile, every test is rolled back
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
@Transactional
class RentedOffersTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private OfferRepository offerRepository;
    @Autowired
    private ApplicationRepository applicationRepository;
    @Autowired
    private UserRepository userRepository;

    private Offer available;
    private Offer rented;
    private Offer disabled;
    private Application waitingApplication;

    private Offer offer(User owner, String title, boolean active) {
        Apartment apartment = new Apartment();
        apartment.setTitle(title);
        apartment.setDescription("Bright room with balcony, 5 minutes to the OTH campus.");
        apartment.setLocation("Galgenbergstraße 30, 93053 Regensburg");
        apartment.setApartmentType(ApartmentType.WG);
        apartment.setPrice(500.0);

        Offer offer = new Offer();
        offer.setApartment(apartment);
        offer.setOwner(owner);
        offer.setStayType(StayType.NACHMIETER);
        offer.setAvailableFrom(LocalDate.now().plusDays(7));
        offer.setActive(active);
        return offerRepository.save(offer);
    }

    private Application application(Offer offer, User applicant, ApplicationStatus status) {
        return applicationRepository.save(Application.builder()
                .offer(offer)
                .applicant(applicant)
                .message("Hi, I am interested in the room and study at OTH.")
                .status(status)
                .build());
    }

    @BeforeEach
    void createOffers() {
        User owner = userRepository.findByEmail("max.mustermann@stud.oth-regensburg.de").orElseThrow();
        User tenant = userRepository.findByEmail("anna.schmidt@stud.oth-regensburg.de").orElseThrow();
        User otherApplicant = userRepository.save(User.builder()
                .name("Lena Weber")
                .email("lena.weber@stud.oth-regensburg.de")
                .password("secret789")
                .role(UserRole.STUDENT)
                .build());

        available = offer(owner, "Available room", true);

        //what finalize-offer leaves behind: inactive offer + one OFFERED application
        rented = offer(owner, "Rented room", false);
        application(rented, tenant, ApplicationStatus.OFFERED);
        waitingApplication = application(rented, otherApplicant, ApplicationStatus.APPROVED);

        //disabled by the owner: inactive, nobody was offered the apartment
        disabled = offer(owner, "Disabled room", false);
        application(disabled, tenant, ApplicationStatus.PENDING);
    }

    private Map<Long, Boolean> rentedFlagsById(String url) throws Exception {
        String json = mockMvc.perform(get(url)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        List<Map<String, Object>> offers = objectMapper.readValue(json, new TypeReference<>() {
        });
        return offers.stream().collect(java.util.stream.Collectors.toMap(
                offer -> ((Number) offer.get("id")).longValue(),
                offer -> (Boolean) offer.get("rented")));
    }

    @Test
    void feedWithRentedShowsAvailableAndRentedButNotDisabledOffers() throws Exception {
        Map<Long, Boolean> offers = rentedFlagsById("/offers?includeRented=true");

        assertThat(offers).containsEntry(available.getId(), false);
        assertThat(offers).containsEntry(rented.getId(), true);
        assertThat(offers).doesNotContainKey(disabled.getId());
    }

    @Test
    void defaultSearchStillOnlyReturnsAvailableOffers() throws Exception {
        Map<Long, Boolean> offers = rentedFlagsById("/offers");

        assertThat(offers).containsEntry(available.getId(), false);
        assertThat(offers).doesNotContainKeys(rented.getId(), disabled.getId());
    }

    @Test
    void offerDetailsTellRentedAndDisabledApart() throws Exception {
        mockMvc.perform(get("/offers/" + rented.getId()))
                .andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.rented").value(true));
        mockMvc.perform(get("/offers/" + disabled.getId()))
                .andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.rented").value(false));
    }

    @Test
    void aRentedApartmentCannotBeOfferedToASecondApplicant() throws Exception {
        mockMvc.perform(post("/applications/" + waitingApplication.getId() + "/finalize-offer"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("already been rented")));

        assertThat(applicationRepository.findById(waitingApplication.getId()).orElseThrow().getStatus())
                .isEqualTo(ApplicationStatus.APPROVED);
    }

    @Test
    void finalizingAnOfferMakesItRentedAndKeepsItVisible() throws Exception {
        User tenant = userRepository.findByEmail("anna.schmidt@stud.oth-regensburg.de").orElseThrow();
        Application application = application(available, tenant, ApplicationStatus.APPROVED);

        mockMvc.perform(post("/applications/" + application.getId() + "/finalize-offer")).andExpect(status().isOk());

        assertThat(rentedFlagsById("/offers?includeRented=true")).containsEntry(available.getId(), true);
        assertThat(rentedFlagsById("/offers")).doesNotContainKey(available.getId());
    }
}
