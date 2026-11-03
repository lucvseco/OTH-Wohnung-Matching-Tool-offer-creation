package com.housing.oth_nest.validation;

import com.housing.oth_nest.exception.BadRequestException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.housing.oth_nest.validation.ValidationLimits.PHOTOS_COUNT_MAX;
import static com.housing.oth_nest.validation.ValidationLimits.PHOTO_SIZE_MAX;

//checks uploaded offer photos, mirrors filterNewPhotos()/validatePhotos() in the frontend
public final class PhotoValidator {

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp");

    private static final byte[] JPEG_SIGNATURE = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
    private static final byte[] RIFF_SIGNATURE = {'R', 'I', 'F', 'F'};
    private static final byte[] WEBP_SIGNATURE = {'W', 'E', 'B', 'P'};

    private PhotoValidator() {
    }

    //validates every file before anything is stored, returns the file extension of each one (same order)
    public static List<String> validate(List<MultipartFile> files) {
        if (files == null) {
            return List.of();
        }
        if (files.size() > PHOTOS_COUNT_MAX) {
            throw new BadRequestException("You can upload at most " + PHOTOS_COUNT_MAX + " photos.");
        }
        return files.stream().map(PhotoValidator::validate).toList();
    }

    public static String validate(MultipartFile file) {
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";

        if (file.isEmpty()) {
            throw new BadRequestException("\"" + name + "\" is empty.");
        }
        if (file.getSize() > PHOTO_SIZE_MAX) {
            throw new BadRequestException("\"" + name + "\" is larger than " + PHOTO_SIZE_MAX / (1024 * 1024) + " MB.");
        }

        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        String extension = EXTENSIONS.get(contentType);
        if (extension == null) {
            throw new BadRequestException("\"" + name + "\" is not a supported image (use JPG, PNG or WEBP).");
        }

        //the content type is chosen by the client, so the file content has to match it as well
        if (!hasMatchingSignature(file, extension)) {
            throw new BadRequestException("\"" + name + "\" is not a valid " + extension.toUpperCase() + " image.");
        }
        return extension;
    }

    //keeps only safe characters of the original name and always uses the extension of the checked type
    public static String safeFileName(MultipartFile file, String extension) {
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
        String baseName = original
                .replaceAll(".*[/\\\\]", "")      //drop any directory part
                .replaceAll("\\.[^.]*$", "")       //drop the client's extension
                .replaceAll("[^A-Za-z0-9_-]", "_");
        if (baseName.isBlank()) {
            baseName = "photo";
        }
        if (baseName.length() > 50) {
            baseName = baseName.substring(0, 50);
        }
        return UUID.randomUUID() + "_" + baseName + "." + extension;
    }

    private static boolean hasMatchingSignature(MultipartFile file, String extension) {
        byte[] header = new byte[12];
        int read;
        try (InputStream in = file.getInputStream()) {
            read = in.readNBytes(header, 0, header.length);
        } catch (IOException e) {
            return false;
        }

        return switch (extension) {
            case "jpg" -> startsWithAt(header, read, 0, JPEG_SIGNATURE);
            case "png" -> startsWithAt(header, read, 0, PNG_SIGNATURE);
            case "webp" -> startsWithAt(header, read, 0, RIFF_SIGNATURE) && startsWithAt(header, read, 8, WEBP_SIGNATURE);
            default -> false;
        };
    }

    private static boolean startsWithAt(byte[] header, int read, int offset, byte[] expected) {
        if (read < offset + expected.length) {
            return false;
        }
        return Arrays.equals(header, offset, offset + expected.length, expected, 0, expected.length);
    }
}
