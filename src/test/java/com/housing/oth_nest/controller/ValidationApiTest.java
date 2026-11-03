package com.housing.oth_nest.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.housing.oth_nest.config.SecurityConfig;
import com.housing.oth_nest.service.ApplicationService;
import com.housing.oth_nest.service.ChatService;
import com.housing.oth_nest.service.OfferService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;
import java.util.stream.Stream;

import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

//sends incorrect requests through the real controllers and checks they are rejected before reaching a service
@WebMvcTest(controllers = {OfferController.class, ApplicationController.class, ChatController.class})
@Import(SecurityConfig.class)
class ValidationApiTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OfferService offerService;
    @MockBean
    private ApplicationService applicationService;
    @MockBean
    private ChatService chatService;

    private static final LocalDate TODAY = LocalDate.now();

    @SuppressWarnings("unchecked")
    private static Map<String, Object> apartmentOf(Map<String, Object> offer) {
        return (Map<String, Object>) offer.get("apartment");
    }

    private static Map<String, Object> validOffer() {
        Map<String, Object> apartment = new HashMap<>();
        apartment.put("title", "Cozy WG Room in City Center");
        apartment.put("description", "Bright room with balcony, 5 minutes to the OTH campus.");
        apartment.put("location", "Galgenbergstraße 30, 93053 Regensburg");
        apartment.put("apartmentType", "WG");
        apartment.put("price", 500);
        apartment.put("kaltmiete", 400);
        apartment.put("nebenkosten", 100);
        apartment.put("deposit", 1200);
        apartment.put("area", 18);
        apartment.put("petsPermission", "maybe");

        Map<String, Object> offer = new HashMap<>();
        offer.put("ownerId", 1);
        offer.put("stayType", "ZWISCHENMIETE");
        offer.put("apartment", apartment);
        offer.put("availableFrom", TODAY.plusDays(7).toString());
        offer.put("availableUntil", TODAY.plusDays(90).toString());
        return offer;
    }

    private ResultActions postOffer(Map<String, Object> offer) throws Exception {
        byte[] json = objectMapper.writeValueAsBytes(offer);
        return mockMvc.perform(multipart("/offers")
                .file(new MockMultipartFile("offer", "", MediaType.APPLICATION_JSON_VALUE, json)));
    }

    private ResultActions postJson(String url, Object body) throws Exception {
        return mockMvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body)));
    }

    @Test
    void validOfferReachesTheService() throws Exception {
        postOffer(validOffer()).andExpect(status().isOk());
        verify(offerService).createOffer(any(), any());
    }

    static Stream<Arguments> invalidOffers() {
        return Stream.of(
                arguments("negative kaltmiete", (Consumer<Map<String, Object>>) o -> apartmentOf(o).put("kaltmiete", -500),
                        "apartment.kaltmiete"),
                arguments("negative deposit", (Consumer<Map<String, Object>>) o -> apartmentOf(o).put("deposit", -1),
                        "apartment.deposit"),
                arguments("negative area", (Consumer<Map<String, Object>>) o -> apartmentOf(o).put("area", -20),
                        "apartment.area"),
                arguments("blank title", (Consumer<Map<String, Object>>) o -> apartmentOf(o).put("title", "    "),
                        "apartment.title"),
                arguments("unknown house rule value", (Consumer<Map<String, Object>>) o -> apartmentOf(o).put("petsPermission", "yes"),
                        "apartment.petsPermission"),
                arguments("move-in date in the past", (Consumer<Map<String, Object>>) o -> o.put("availableFrom", TODAY.minusDays(1).toString()),
                        "availableFrom"),
                arguments("move-out before move-in", (Consumer<Map<String, Object>>) o -> o.put("availableUntil", TODAY.plusDays(1).toString()),
                        "availableUntilAfterAvailableFrom"),
                arguments("couchsurfing with rent", (Consumer<Map<String, Object>>) o -> o.put("stayType", "COUCHSURFING"),
                        "couchsurfingFree")
        );
    }

    @ParameterizedTest(name = "rejects {0}")
    @MethodSource("invalidOffers")
    void rejectsInvalidOffer(String name, Consumer<Map<String, Object>> change, String expectedField) throws Exception {
        Map<String, Object> offer = validOffer();
        change.accept(offer);

        postOffer(offer)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors['" + expectedField + "']").exists());
        verify(offerService, never()).createOffer(any(), any());
    }

    //a Nachmieter offer without move-out date, so the move-in date is the only value that can be wrong
    private static Map<String, Object> offerMovingInOn(String date) {
        Map<String, Object> offer = validOffer();
        offer.put("stayType", "NACHMIETER");
        offer.remove("availableUntil");
        offer.put("availableFrom", date);
        return offer;
    }

    static Stream<String> impossibleOrMalformedDates() {
        int nextYear = TODAY.getYear() + 1;
        return Stream.of(nextYear + "-02-30", nextYear + "-04-31", nextYear + "-13-01", "01.07." + nextYear, "tomorrow");
    }

    @ParameterizedTest
    @MethodSource("impossibleOrMalformedDates")
    void rejectsImpossibleOrMalformedDates(String date) throws Exception {
        //without strict parsing Jackson silently turns e.g. Feb 30 into Feb 28
        postOffer(offerMovingInOn(date))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Request body is malformed or contains invalid values."));
        verify(offerService, never()).createOffer(any(), any());
    }

    @Test
    void acceptsARealDateInTheSameRequest() throws Exception {
        postOffer(offerMovingInOn((TODAY.getYear() + 1) + "-02-28")).andExpect(status().isOk());
        verify(offerService).createOffer(any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "      ", "Hi!"})
    void rejectsBlankOrShortApplications(String message) throws Exception {
        postJson("/applications", Map.of("applicantId", 1, "offerId", 1, "message", message))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.message").exists());
        verify(applicationService, never()).apply(any());
    }

    @Test
    void validApplicationReachesTheService() throws Exception {
        postJson("/applications", Map.of("applicantId", 1, "offerId", 1, "message", "Hi, I am Max and I study at OTH."))
                .andExpect(status().isCreated());
        verify(applicationService).apply(any());
    }

    @Test
    void rejectsTooLongDeclineReason() throws Exception {
        mockMvc.perform(patch("/applications/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "DECLINED", "declineMessage", "a".repeat(501)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.declineMessage").exists());
        verify(applicationService, never()).updateApplicationStatus(any(), any());
    }

    static Stream<String> invalidChatMessages() {
        return Stream.of("", "      ", "\n\t", "a".repeat(2001));
    }

    @ParameterizedTest
    @MethodSource("invalidChatMessages")
    void rejectsEmptyOrTooLongChatMessages(String content) throws Exception {
        postJson("/chats/1/messages", Map.of("senderId", 1, "content", content))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.content").exists());
        verify(chatService, never()).sendMessage(any(), any());
    }

    @Test
    void rejectsMalformedJson() throws Exception {
        mockMvc.perform(post("/chats/1/messages").contentType(MediaType.APPLICATION_JSON).content("{\"senderId\": 1, \"content\": "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Request body is malformed or contains invalid values."));
    }
}
