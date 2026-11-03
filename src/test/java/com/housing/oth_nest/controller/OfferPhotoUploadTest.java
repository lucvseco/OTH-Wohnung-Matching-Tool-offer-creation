package com.housing.oth_nest.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.housing.oth_nest.config.UploadProperties;
import com.housing.oth_nest.repository.OfferRepository;
import com.housing.oth_nest.service.PhotoStorage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

//full application on the in-memory H2 profile: valid photos land in app.uploads.dir and are served from there,
//invalid photos or a failed offer must not leave an offer or a file behind
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
//own photo folder, and an own in-memory database so data.sql isn't seeded twice into the one other test contexts use
@TestPropertySource(properties = {
        "app.uploads.dir=target/test-uploads",
        "spring.datasource.url=jdbc:h2:mem:photo-upload;DB_CLOSE_DELAY=-1"})
class OfferPhotoUploadTest {

    private static final Path UPLOAD_DIR = Paths.get("target/test-uploads").toAbsolutePath().normalize();
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0};

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private OfferRepository offerRepository;
    @Autowired
    private UploadProperties uploads;
    @Autowired
    private PhotoStorage photoStorage;
    @Autowired
    private PlatformTransactionManager transactionManager;

    private MockMultipartFile validOfferPart() throws Exception {
        Map<String, Object> apartment = Map.of(
                "title", "Cozy WG Room in City Center",
                "description", "Bright room with balcony, 5 minutes to the OTH campus.",
                "location", "Galgenbergstraße 30, 93053 Regensburg",
                "apartmentType", "WG",
                "price", 500,
                "kaltmiete", 400,
                "nebenkosten", 100);
        Map<String, Object> offer = Map.of(
                "ownerId", 1,
                "stayType", "NACHMIETER",
                "apartment", apartment,
                "availableFrom", LocalDate.now().plusDays(7).toString());
        return new MockMultipartFile("offer", "", MediaType.APPLICATION_JSON_VALUE, objectMapper.writeValueAsBytes(offer));
    }

    private static MockMultipartFile photo(String name) {
        return new MockMultipartFile("files", name, "image/jpeg", JPEG);
    }

    private static long countUploads() throws IOException {
        if (!Files.exists(UPLOAD_DIR)) {
            return 0;
        }
        try (Stream<Path> files = Files.list(UPLOAD_DIR)) {
            return files.count();
        }
    }

    private static Path fileOf(String url) {
        return UPLOAD_DIR.resolve(url.substring(url.lastIndexOf('/') + 1));
    }

    private void expectRejected(MockMultipartHttpServletRequestBuilder request, String message) throws Exception {
        long offersBefore = offerRepository.count();
        long filesBefore = countUploads();

        mockMvc.perform(request)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString(message)));

        assertThat(offerRepository.count()).isEqualTo(offersBefore);
        assertThat(countUploads()).isEqualTo(filesBefore);
    }

    @Test
    void usesTheConfiguredFolderAndUrl() {
        assertThat(uploads.directory()).isEqualTo(UPLOAD_DIR);
        assertThat(uploads.urlFor("a.jpg")).isEqualTo("http://localhost:8080/uploads/a.jpg");
    }

    @Test
    void savesValidPhotosInTheConfiguredFolderAndServesThem() throws Exception {
        String body = mockMvc.perform(multipart("/offers").file(validOfferPart()).file(photo("my room.jpg")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photoUrls[0]").value(startsWith("http://localhost:8080/uploads/")))
                .andExpect(jsonPath("$.photoUrls[0]").value(containsString("_my_room.jpg")))
                .andReturn().getResponse().getContentAsString();

        String url = objectMapper.readTree(body).at("/photoUrls/0").asText();
        Path stored = fileOf(url);
        assertThat(stored).exists().hasBinaryContent(JPEG);

        mockMvc.perform(get("/uploads/" + stored.getFileName()))
                .andExpect(status().isOk())
                .andExpect(content().bytes(JPEG));

        Files.delete(stored);
    }

    @Test
    void deletesThePhotosAgainWhenSavingTheOfferFails() throws Exception {
        long filesBefore = countUploads();
        List<String> urls = new ArrayList<>();

        //same as a database error after the photos were written: the transaction rolls back
        assertThatThrownBy(() -> new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            urls.addAll(photoStorage.store(List.of(photo("a.jpg"), photo("b.jpg")), List.of("jpg", "jpg")));
            assertThat(fileOf(urls.get(0))).exists();
            throw new IllegalStateException("database down");
        })).hasMessage("database down");

        assertThat(urls).hasSize(2);
        assertThat(fileOf(urls.get(0))).doesNotExist();
        assertThat(fileOf(urls.get(1))).doesNotExist();
        assertThat(countUploads()).isEqualTo(filesBefore);
    }

    @Test
    void rejectsHtmlDisguisedAsJpeg() throws Exception {
        MockMultipartFile fake = new MockMultipartFile(
                "files", "room.jpg", "image/jpeg", "<html><script>alert(1)</script></html>".getBytes());
        expectRejected(multipart("/offers").file(validOfferPart()).file(fake), "not a valid JPG");
    }

    @Test
    void rejectsNonImageFiles() throws Exception {
        MockMultipartFile text = new MockMultipartFile("files", "notes.txt", "text/plain", "hello".getBytes());
        expectRejected(multipart("/offers").file(validOfferPart()).file(text), "not a supported image");
    }

    @Test
    void rejectsTooManyPhotos() throws Exception {
        MockMultipartHttpServletRequestBuilder request = multipart("/offers").file(validOfferPart());
        for (int i = 0; i < 9; i++) {
            request.file(photo("photo-" + i + ".jpg"));
        }
        expectRejected(request, "at most 8 photos");
    }
}
