package com.housing.oth_nest.controller;

import com.housing.oth_nest.service.OfferService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

//a real server, Spring Boot's error page (/error) is only used outside of MockMvc
//own in-memory database, the seed users of the other H2 tests' database would be inserted twice
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:unexpected-error;DB_CLOSE_DELAY=-1")
@ActiveProfiles("h2")
class UnexpectedErrorResponseTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @MockBean
    private OfferService offerService;

    @Test
    void unexpectedExceptionTellsTheClientWhatWentWrong() {
        when(offerService.searchOffers(any(), any(), any(), any(), any()))
                .thenThrow(new IllegalStateException("Offer table is missing"));

        ResponseEntity<Map> response = restTemplate.getForEntity("/offers", Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody())
                .containsEntry("exception", "java.lang.IllegalStateException")
                .containsEntry("message", "Offer table is missing");
    }

    //what a backend running on outdated compiled classes threw when posting an offer
    @Test
    void errorFromOutdatedClassesTellsTheClientWhatWentWrong() {
        when(offerService.searchOffers(any(), any(), any(), any(), any()))
                .thenThrow(new NoSuchMethodError("'OfferResponseDto DtoMapper.toOfferResponse(Offer)'"));

        ResponseEntity<Map> response = restTemplate.getForEntity("/offers", Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody())
                .containsEntry("exception", "java.lang.NoSuchMethodError")
                .containsEntry("message", "'OfferResponseDto DtoMapper.toOfferResponse(Offer)'");
    }
}
