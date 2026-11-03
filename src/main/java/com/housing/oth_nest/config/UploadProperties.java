package com.housing.oth_nest.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.io.File;
import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;

//where offer photos are saved and the address the browser loads them from, set with app.uploads.* in application.properties
//or per machine with the APP_UPLOADS_DIR / APP_UPLOADS_URL environment variables
@ConfigurationProperties(prefix = "app.uploads")
public record UploadProperties(
        //folder on this computer, Windows and Linux/macOS paths are accepted (see normalize)
        //a relative path starts in the folder the backend is launched from (the project root)
        @DefaultValue("uploads") String dir,
        //public address of that folder, its path ("/uploads") is also where WebConfig serves the photos
        @DefaultValue("http://localhost:8080/uploads") String url) {

    static final boolean WINDOWS = File.separatorChar == '\\';

    public UploadProperties {
        //fail at startup instead of on the first upload
        normalize(dir, WINDOWS, System.getProperty("user.home"));

        url = url.replaceAll("/+$", "");
        String path = URI.create(url).getPath();
        if (path == null || path.isEmpty()) {
            throw new IllegalStateException(
                    "app.uploads.url needs a path for the photos, e.g. http://localhost:8080/uploads (was: " + url + ")");
        }
    }

    //absolute folder for the system the backend runs on
    public Path directory() {
        return Paths.get(normalize(dir, WINDOWS, System.getProperty("user.home"))).toAbsolutePath().normalize();
    }

    //"/uploads", the request path WebConfig maps to the directory
    public String urlPath() {
        return URI.create(url).getPath();
    }

    public String urlFor(String fileName) {
        return url + "/" + fileName;
    }

    //turns the configured folder into a path for this system:
    // - "/" and "\" are both accepted as separators, on Windows and on Linux/macOS
    // - "~" at the start is the user's home folder (C:\Users\<name> or /home/<name>)
    // - surrounding quotes are dropped ("C:\My Photos" copied from Explorer)
    // - Windows paths (C:\..., \\server\share) are rejected on Linux/macOS, they would turn into a folder named "C:..."
    static String normalize(String raw, boolean windows, String home) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalStateException("app.uploads.dir is empty, set it to the folder for the offer photos, e.g. uploads");
        }
        String dir = raw.trim();
        if (dir.length() >= 2
                && (dir.startsWith("\"") && dir.endsWith("\"") || dir.startsWith("'") && dir.endsWith("'"))) {
            dir = dir.substring(1, dir.length() - 1).trim();
        }

        if (dir.equals("~") || dir.startsWith("~/") || dir.startsWith("~\\")) {
            dir = home + dir.substring(1);
        }

        boolean drivePath = dir.matches("[A-Za-z]:.*");
        if (drivePath && !dir.matches("[A-Za-z]:([\\\\/].*)?")) {
            //"C:oth-nest" is what C:\oth-nest becomes in a .properties file, where "\" is an escape character
            throw new IllegalStateException("app.uploads.dir \"" + raw + "\" has no separator after the drive letter."
                    + " In application.properties write C:/oth-nest/uploads or C:\\\\oth-nest\\\\uploads.");
        }
        if (!windows && (drivePath || dir.startsWith("\\\\"))) {
            throw new IllegalStateException("app.uploads.dir \"" + raw + "\" is a Windows path, but the backend runs on "
                    + System.getProperty("os.name") + ". Use e.g. /var/lib/oth-nest/uploads, ~/oth-nest/uploads"
                    + " or set APP_UPLOADS_DIR on this machine.");
        }

        return windows ? dir.replace('/', '\\') : dir.replace('\\', '/');
    }
}
