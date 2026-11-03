package com.housing.oth_nest.dto;

import com.housing.oth_nest.model.ApartmentType;
import com.housing.oth_nest.model.ApplicationStatus;
import com.housing.oth_nest.model.StayType;
import com.housing.oth_nest.model.UserRole;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDate;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.params.provider.Arguments.arguments;

//feeds incorrect values into every request DTO and checks that validation rejects them
class RequestDtoValidationTest {

    private static Validator validator;
    private static final LocalDate TODAY = LocalDate.now();

    @BeforeAll
    static void setUpValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private static Set<String> invalidFields(Object dto) {
        return validator.validate(dto).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    static OfferRequestDto validOffer() {
        ApartmentDto apartment = new ApartmentDto();
        apartment.setTitle("Cozy WG Room in City Center");
        apartment.setDescription("Bright room with balcony, 5 minutes to the OTH campus.");
        apartment.setLocation("Galgenbergstraße 30, 93053 Regensburg");
        apartment.setApartmentType(ApartmentType.WG);
        apartment.setKaltmiete(400.0);
        apartment.setNebenkosten(100.0);
        apartment.setPrice(500.0);
        apartment.setDeposit(1200.0);
        apartment.setAblose(0.0);
        apartment.setSonstiges(0.0);
        apartment.setArea(18.5);
        apartment.setMalesCount(1);
        apartment.setFemalesCount(1);
        apartment.setDiverseCount(0);
        apartment.setTotalOccupants(2);
        apartment.setPetsPermission("maybe");
        apartment.setSmokingPermission("not-allowed");
        apartment.setPartiesPermission("maybe");
        apartment.setInstrumentsPermission("maybe");
        apartment.setVisitorsPermission("allowed");

        OfferRequestDto offer = new OfferRequestDto();
        offer.setOwnerId(1L);
        offer.setStayType(StayType.ZWISCHENMIETE);
        offer.setApartment(apartment);
        offer.setAvailableFrom(TODAY.plusDays(7));
        offer.setAvailableUntil(TODAY.plusDays(90));
        return offer;
    }

    private static Arguments apartment(String name, Consumer<ApartmentDto> change, String field) {
        return arguments(name, (Consumer<OfferRequestDto>) offer -> change.accept(offer.getApartment()), field);
    }

    private static Arguments offer(String name, Consumer<OfferRequestDto> change, String field) {
        return arguments(name, change, field);
    }

    static Stream<Arguments> invalidOffers() {
        return Stream.of(
                //texts
                apartment("missing title", a -> a.setTitle(null), "apartment.title"),
                apartment("whitespace title", a -> a.setTitle("     "), "apartment.title"),
                apartment("title too short", a -> a.setTitle("ab"), "apartment.title"),
                apartment("title too long", a -> a.setTitle("a".repeat(101)), "apartment.title"),
                apartment("title without letters", a -> a.setTitle("!!!!!"), "apartment.title"),
                apartment("missing description", a -> a.setDescription(null), "apartment.description"),
                apartment("whitespace description", a -> a.setDescription("        "), "apartment.description"),
                apartment("description too short", a -> a.setDescription("Too short"), "apartment.description"),
                apartment("description too long", a -> a.setDescription("a".repeat(1001)), "apartment.description"),
                apartment("address too short", a -> a.setLocation("abc"), "apartment.location"),
                apartment("address without number", a -> a.setLocation("Galgenbergstraße"), "apartment.location"),
                apartment("address without street/city", a -> a.setLocation("93053"), "apartment.location"),
                apartment("address too long", a -> a.setLocation("Street 1 " + "x".repeat(200)), "apartment.location"),

                //prices
                apartment("negative kaltmiete", a -> a.setKaltmiete(-500.0), "apartment.kaltmiete"),
                apartment("kaltmiete with 3 decimals", a -> a.setKaltmiete(400.999), "apartment.kaltmiete"),
                apartment("absurd kaltmiete", a -> a.setKaltmiete(10_001.0), "apartment.kaltmiete"),
                apartment("negative nebenkosten", a -> a.setNebenkosten(-1.0), "apartment.nebenkosten"),
                apartment("negative price", a -> a.setPrice(-1.0), "apartment.price"),
                apartment("absurd price", a -> a.setPrice(1e9), "apartment.price"),
                apartment("missing price", a -> a.setPrice(null), "apartment.price"),
                apartment("price not matching breakdown", a -> a.setPrice(999.0), "apartment.priceMatchingBreakdown"),
                apartment("negative deposit", a -> a.setDeposit(-100.0), "apartment.deposit"),
                apartment("absurd deposit", a -> a.setDeposit(50_001.0), "apartment.deposit"),
                apartment("negative ablose", a -> a.setAblose(-5.0), "apartment.ablose"),
                apartment("negative sonstiges", a -> a.setSonstiges(-0.5), "apartment.sonstiges"),

                //area
                apartment("negative area", a -> a.setArea(-20.0), "apartment.area"),
                apartment("unrealistically small area", a -> a.setArea(2.0), "apartment.areaRealistic"),
                apartment("unrealistically large area", a -> a.setArea(1001.0), "apartment.area"),
                apartment("area with 3 decimals", a -> a.setArea(20.555), "apartment.area"),

                //tenants
                apartment("negative males", a -> a.setMalesCount(-1), "apartment.malesCount"),
                apartment("too many females", a -> a.setFemalesCount(21), "apartment.femalesCount"),
                apartment("negative diverse", a -> a.setDiverseCount(-3), "apartment.diverseCount"),
                apartment("too many tenants in total", a -> {
                    a.setMalesCount(15);
                    a.setFemalesCount(10);
                    a.setTotalOccupants(null);
                }, "apartment.occupantsWithinLimit"),
                apartment("total not matching the breakdown", a -> a.setTotalOccupants(7), "apartment.totalOccupantsConsistent"),

                //house rules and type
                apartment("unknown permission", a -> a.setPetsPermission("yes"), "apartment.petsPermission"),
                apartment("permission in wrong case", a -> a.setSmokingPermission("ALLOWED"), "apartment.smokingPermission"),
                apartment("missing apartment type", a -> a.setApartmentType(null), "apartment.apartmentType"),

                //dates
                offer("missing move-in date", o -> o.setAvailableFrom(null), "availableFrom"),
                offer("move-in date in the past", o -> o.setAvailableFrom(TODAY.minusDays(1)), "availableFrom"),
                offer("move-in date years ago", o -> o.setAvailableFrom(LocalDate.of(2020, 1, 1)), "availableFrom"),
                offer("move-in date too far ahead", o -> {
                    o.setAvailableFrom(TODAY.plusYears(2).plusDays(1));
                    o.setAvailableUntil(TODAY.plusYears(3));
                }, "availableFromWithinLimit"),
                offer("missing move-out date for a sublet", o -> o.setAvailableUntil(null), "availableUntilGivenForSublet"),
                offer("move-out before move-in", o -> o.setAvailableUntil(TODAY.plusDays(3)), "availableUntilAfterAvailableFrom"),
                offer("move-out on the move-in day", o -> o.setAvailableUntil(TODAY.plusDays(7)), "availableUntilAfterAvailableFrom"),
                offer("sublet longer than 2 years", o -> o.setAvailableUntil(TODAY.plusDays(7).plusYears(2).plusDays(1)),
                        "subletWithinLimit"),

                //stay type vs. price
                offer("couchsurfing with rent", o -> o.setStayType(StayType.COUCHSURFING), "couchsurfingFree"),
                offer("paid stay without rent", o -> {
                    o.setStayType(StayType.NACHMIETER);
                    o.getApartment().setKaltmiete(0.0);
                    o.getApartment().setNebenkosten(0.0);
                    o.getApartment().setPrice(0.0);
                }, "rentGivenForPaidStay"),
                offer("missing owner", o -> o.setOwnerId(null), "ownerId"),
                offer("missing stay type", o -> o.setStayType(null), "stayType"),
                offer("missing apartment", o -> o.setApartment(null), "apartment")
        );
    }

    @Test
    void acceptsAValidOffer() {
        assertThat(invalidFields(validOffer())).isEmpty();
    }

    @Test
    void acceptsValidEdgeCases() {
        OfferRequestDto couchsurfing = validOffer();
        couchsurfing.setStayType(StayType.COUCHSURFING);
        couchsurfing.setAvailableUntil(null);
        couchsurfing.getApartment().setKaltmiete(0.0);
        couchsurfing.getApartment().setNebenkosten(0.0);
        couchsurfing.getApartment().setPrice(0.0);
        couchsurfing.getApartment().setArea(0.0); //0 = area not specified
        assertThat(invalidFields(couchsurfing)).isEmpty();

        OfferRequestDto nachmieter = validOffer();
        nachmieter.setStayType(StayType.NACHMIETER);
        nachmieter.setAvailableUntil(null);
        nachmieter.setAvailableFrom(TODAY);
        nachmieter.getApartment().setArea(null);
        assertThat(invalidFields(nachmieter)).isEmpty();
    }

    @ParameterizedTest(name = "rejects {0}")
    @MethodSource("invalidOffers")
    void rejectsInvalidOffer(String name, Consumer<OfferRequestDto> change, String expectedField) {
        OfferRequestDto offer = validOffer();
        change.accept(offer);
        assertThat(invalidFields(offer)).contains(expectedField);
    }

    @Test
    void trimsTextBeforeValidating() {
        ApartmentDto apartment = new ApartmentDto();
        apartment.setTitle("   Cozy room   ");
        apartment.setLocation("  Galgenbergstraße 30, 93053 Regensburg ");
        assertThat(apartment.getTitle()).isEqualTo("Cozy room");
        assertThat(apartment.getLocation()).isEqualTo("Galgenbergstraße 30, 93053 Regensburg");

        //"  ab  " would pass a plain length check of 3, trimmed it is too short
        OfferRequestDto offer = validOffer();
        offer.getApartment().setTitle("  ab  ");
        assertThat(invalidFields(offer)).contains("apartment.title");
    }

    private static ApplicationRequestDto application(String message) {
        ApplicationRequestDto dto = new ApplicationRequestDto();
        dto.setApplicantId(1L);
        dto.setOfferId(1L);
        dto.setMessage(message);
        return dto;
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "     ", "\n\n\t", "Hi!", "  Hi there  "})
    void rejectsShortOrBlankApplicationMessages(String message) {
        assertThat(invalidFields(application(message))).contains("message");
    }

    @Test
    void rejectsTooLongApplicationMessage() {
        assertThat(invalidFields(application("a".repeat(2001)))).contains("message");
        assertThat(invalidFields(application("   Hi, I am Max and I study at OTH.   "))).isEmpty();
    }

    @Test
    void limitsTheDeclineReason() {
        ApplicationStatusUpdateDto dto = new ApplicationStatusUpdateDto();
        dto.setStatus(ApplicationStatus.DECLINED);

        dto.setDeclineMessage("a".repeat(501));
        assertThat(invalidFields(dto)).contains("declineMessage");

        dto.setDeclineMessage("    ");
        assertThat(dto.getDeclineMessage()).isNull();
        assertThat(invalidFields(dto)).isEmpty();

        dto.setStatus(null);
        assertThat(invalidFields(dto)).contains("status");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "     ", "\n\t"})
    void rejectsBlankChatMessages(String content) {
        SendMessageRequestDto dto = new SendMessageRequestDto();
        dto.setSenderId(1L);
        dto.setContent(content);
        assertThat(invalidFields(dto)).contains("content");
    }

    @Test
    void rejectsTooLongChatMessage() {
        SendMessageRequestDto dto = new SendMessageRequestDto();
        dto.setSenderId(1L);
        dto.setContent("a".repeat(2001));
        assertThat(invalidFields(dto)).contains("content");
    }

    @ParameterizedTest
    @ValueSource(strings = {"max@gmail.com", "max@oth-regensburg.de.evil.com", "max@fake-oth-regensburg.de", "not-an-email"})
    void registrationRequiresAnOthEmail(String email) {
        RegisterRequest request = new RegisterRequest();
        request.setName("Max Mustermann");
        request.setEmail(email);
        request.setPassword("password123");
        request.setRole(UserRole.values()[0]);
        assertThat(invalidFields(request)).contains("email");

        request.setEmail("max.mustermann@stud.oth-regensburg.de");
        assertThat(invalidFields(request)).isEmpty();
    }
}
