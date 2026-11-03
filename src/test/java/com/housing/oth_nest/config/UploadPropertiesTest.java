package com.housing.oth_nest.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

//normalize() gets the system as a parameter, so the Windows and the Linux rules are both checked on every machine
class UploadPropertiesTest {

    private static final String URL = "http://localhost:8080/uploads";
    private static final String WINDOWS_HOME = "C:\\Users\\max";
    private static final String LINUX_HOME = "/home/max";

    @ParameterizedTest(name = "Windows: [{0}] -> [{1}]")
    @CsvSource(delimiter = '|', value = {
            "C:\\oth-nest\\uploads           | C:\\oth-nest\\uploads",
            "C:/oth-nest/uploads             | C:\\oth-nest\\uploads",
            "D:\\                            | D:\\",
            "\"C:\\My Photos\\uploads\"      | C:\\My Photos\\uploads",
            "~/oth-nest/uploads              | C:\\Users\\max\\oth-nest\\uploads",
            "~\\oth-nest\\uploads            | C:\\Users\\max\\oth-nest\\uploads",
            "\\\\nas\\share\\uploads         | \\\\nas\\share\\uploads",
            "uploads/photos                  | uploads\\photos",
            "uploads                         | uploads"})
    void acceptsWindowsPaths(String configured, String expected) {
        assertThat(UploadProperties.normalize(configured, true, WINDOWS_HOME)).isEqualTo(expected);
    }

    @ParameterizedTest(name = "Linux: [{0}] -> [{1}]")
    @CsvSource(delimiter = '|', value = {
            "/var/lib/oth-nest/uploads       | /var/lib/oth-nest/uploads",
            "\"/srv/my photos\"              | /srv/my photos",
            "~/oth-nest/uploads              | /home/max/oth-nest/uploads",
            "~                               | /home/max",
            "uploads\\photos                 | uploads/photos",
            "uploads                         | uploads"})
    void acceptsLinuxPaths(String configured, String expected) {
        assertThat(UploadProperties.normalize(configured, false, LINUX_HOME)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {"C:\\oth-nest\\uploads", "c:/oth-nest", "\\\\nas\\share\\uploads"})
    void rejectsWindowsPathsOnLinux(String configured) {
        assertThatThrownBy(() -> UploadProperties.normalize(configured, false, LINUX_HOME))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("is a Windows path");
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void explainsBackslashesSwallowedByThePropertiesFile(boolean windows) {
        //"C:\oth-nest\photos" written in application.properties arrives as C:oth-nestphotos (the \ are swallowed)
        assertThatThrownBy(() -> UploadProperties.normalize("C:oth-nestuploads", windows, WINDOWS_HOME))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("C:/oth-nest/uploads");
    }

    @ParameterizedTest
    @CsvSource(value = {"''", "'   '", "NULL"}, nullValues = "NULL")
    void rejectsAnEmptyFolder(String configured) {
        assertThatThrownBy(() -> new UploadProperties(configured, URL))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.uploads.dir is empty");
    }

    @Test
    void resolvesFoldersForTheSystemItRunsOn(@TempDir Path temp) {
        assertThat(new UploadProperties(temp.toString(), URL).directory()).isEqualTo(temp.toAbsolutePath());
        assertThat(new UploadProperties("uploads", URL).directory())
                .isEqualTo(Paths.get("uploads").toAbsolutePath().normalize());
        assertThat(new UploadProperties("~/oth-nest", URL).directory())
                .isEqualTo(Paths.get(System.getProperty("user.home"), "oth-nest").toAbsolutePath());
    }

    @Test
    void buildsPhotoUrlsAndTheServedPath() {
        UploadProperties uploads = new UploadProperties("uploads", "http://localhost:8080/uploads/");

        assertThat(uploads.urlFor("a.jpg")).isEqualTo("http://localhost:8080/uploads/a.jpg");
        assertThat(uploads.urlPath()).isEqualTo("/uploads");
    }

    @Test
    void supportsOtherHostsAndPaths() {
        UploadProperties uploads = new UploadProperties("uploads", "https://nest.example.org/media/photos");

        assertThat(uploads.urlFor("a.jpg")).isEqualTo("https://nest.example.org/media/photos/a.jpg");
        assertThat(uploads.urlPath()).isEqualTo("/media/photos");
    }

    @Test
    void rejectsAUrlWithoutPath() {
        //without a path the photos would be served on "/**" next to the API
        assertThatThrownBy(() -> new UploadProperties("uploads", "http://localhost:8080/"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("needs a path");
    }
}
