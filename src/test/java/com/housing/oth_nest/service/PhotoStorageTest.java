package com.housing.oth_nest.service;

import com.housing.oth_nest.config.UploadProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PhotoStorageTest {

    private static final String URL = "http://localhost:8080/uploads";
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0};

    private static PhotoStorage storageIn(Path folder) {
        return new PhotoStorage(new UploadProperties(folder.toString(), URL));
    }

    @Test
    void createsTheConfiguredFolderOnStartup(@TempDir Path temp) {
        Path folder = temp.resolve("oth-nest").resolve("uploads");

        storageIn(folder).prepareFolder();

        assertThat(folder).isDirectory();
    }

    @Test
    void stopsTheStartupWhenTheFolderCannotBeCreated(@TempDir Path temp) throws Exception {
        Path aFile = Files.createFile(temp.resolve("not-a-folder"));

        assertThatThrownBy(() -> storageIn(aFile.resolve("uploads")).prepareFolder())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Could not create the photo folder");
    }

    @Test
    void savesPhotosInTheConfiguredFolder(@TempDir Path temp) {
        List<String> urls = storageIn(temp).store(
                List.of(new MockMultipartFile("files", "room.jpg", "image/jpeg", JPEG)), List.of("jpg"));

        assertThat(urls).singleElement().asString().startsWith(URL + "/").endsWith("_room.jpg");
        String fileName = urls.get(0).substring(URL.length() + 1);
        assertThat(temp.resolve(fileName)).hasBinaryContent(JPEG);
    }
}
