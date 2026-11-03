package com.housing.oth_nest.validation;

import com.housing.oth_nest.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.params.provider.Arguments.arguments;

class PhotoValidatorTest {

    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F'};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 0x0D};
    private static final byte[] WEBP = {'R', 'I', 'F', 'F', 0x24, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' '};

    private static MockMultipartFile file(String name, String type, byte[] content) {
        return new MockMultipartFile("files", name, type, content);
    }

    static Stream<Arguments> invalidPhotos() {
        byte[] tooLarge = Arrays.copyOf(JPEG, (int) ValidationLimits.PHOTO_SIZE_MAX + 1);
        return Stream.of(
                arguments("text file", file("notes.txt", "text/plain", "hello".getBytes()), "not a supported image"),
                arguments("pdf", file("doc.pdf", "application/pdf", "%PDF-1.7".getBytes()), "not a supported image"),
                arguments("gif", file("anim.gif", "image/gif", "GIF89a".getBytes()), "not a supported image"),
                arguments("svg", file("vector.svg", "image/svg+xml", "<svg/>".getBytes()), "not a supported image"),
                arguments("missing type", file("room.jpg", null, JPEG), "not a supported image"),
                arguments("empty file", file("empty.jpg", "image/jpeg", new byte[0]), "is empty"),
                arguments("too large", file("huge.jpg", "image/jpeg", tooLarge), "larger than 1 MB"),
                arguments("html pretending to be a jpeg", file("evil.jpg", "image/jpeg", "<script>alert(1)</script>".getBytes()),
                        "not a valid JPG"),
                arguments("png pretending to be a jpeg", file("room.jpg", "image/jpeg", PNG), "not a valid JPG"),
                arguments("jpeg pretending to be a webp", file("room.webp", "image/webp", JPEG), "not a valid WEBP"),
                arguments("truncated png", file("room.png", "image/png", new byte[]{(byte) 0x89, 'P'}), "not a valid PNG")
        );
    }

    @ParameterizedTest(name = "rejects {0}")
    @MethodSource("invalidPhotos")
    void rejectsInvalidPhotos(String name, MultipartFile photo, String expectedMessage) {
        assertThatThrownBy(() -> PhotoValidator.validate(photo))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining(expectedMessage);
    }

    @Test
    void acceptsRealImagesAndReturnsTheirExtension() {
        assertThat(PhotoValidator.validate(file("a.jpeg", "image/jpeg", JPEG))).isEqualTo("jpg");
        assertThat(PhotoValidator.validate(file("b.png", "IMAGE/PNG", PNG))).isEqualTo("png");
        assertThat(PhotoValidator.validate(file("c.webp", "image/webp", WEBP))).isEqualTo("webp");
        assertThat(PhotoValidator.validate((List<MultipartFile>) null)).isEmpty();
    }

    @Test
    void rejectsMoreThanTheMaximumNumberOfPhotos() {
        List<MultipartFile> photos = new ArrayList<>();
        for (int i = 0; i <= ValidationLimits.PHOTOS_COUNT_MAX; i++) {
            photos.add(file("photo-" + i + ".jpg", "image/jpeg", JPEG));
        }
        assertThatThrownBy(() -> PhotoValidator.validate(photos))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("at most 8 photos");

        assertThat(PhotoValidator.validate(photos.subList(0, ValidationLimits.PHOTOS_COUNT_MAX))).hasSize(8);
    }

    @Test
    void storedFileNamesCannotEscapeTheUploadFolderOrChangeTheType() {
        String uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

        assertThat(PhotoValidator.safeFileName(file("../../evil.html", "image/jpeg", JPEG), "jpg"))
                .matches(uuid + "_evil\\.jpg");
        assertThat(PhotoValidator.safeFileName(file("C:\\Users\\max\\my room (1).PNG", "image/png", PNG), "png"))
                .matches(uuid + "_my_room__1_\\.png");
        assertThat(PhotoValidator.safeFileName(file(".htaccess", "image/jpeg", JPEG), "jpg"))
                .matches(uuid + "_photo\\.jpg");
        assertThat(PhotoValidator.safeFileName(file("a".repeat(200) + ".jpg", "image/jpeg", JPEG), "jpg"))
                .matches(uuid + "_a{50}\\.jpg");
    }
}
