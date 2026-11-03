package com.housing.oth_nest.service;

import com.housing.oth_nest.config.UploadProperties;
import com.housing.oth_nest.validation.PhotoValidator;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

//saves offer photos into the folder set by app.uploads.dir
@Service
public class PhotoStorage {

    private static final Logger log = LoggerFactory.getLogger(PhotoStorage.class);

    private final UploadProperties uploads;

    public PhotoStorage(UploadProperties uploads) {
        this.uploads = uploads;
    }

    //a missing or read-only folder stops the startup with a clear message instead of failing the first upload
    @PostConstruct
    void prepareFolder() {
        Path directory = uploads.directory();
        try {
            Files.createDirectories(directory);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create the photo folder " + directory
                    + " (app.uploads.dir=" + uploads.dir() + "): " + e, e);
        }
        if (!Files.isWritable(directory)) {
            throw new IllegalStateException("The photo folder " + directory + " is not writable for the backend"
                    + " (app.uploads.dir=" + uploads.dir() + "). Choose another folder or fix its permissions.");
        }
        log.info("Offer photos are saved in {} and served under {}", directory, uploads.url());
    }

    //stores photos that already passed PhotoValidator and returns their public URLs (same order)
    //if the surrounding transaction doesn't commit, the files are deleted again so a failed offer leaves no photos behind
    public List<String> store(List<MultipartFile> files, List<String> extensions) {
        List<String> urls = new ArrayList<>();
        if (files == null || files.isEmpty()) {
            return urls;
        }

        List<Path> written = new ArrayList<>();
        deleteOnRollback(written);
        try {
            Path directory = uploads.directory();
            Files.createDirectories(directory);

            for (int i = 0; i < files.size(); i++) {
                MultipartFile file = files.get(i);
                //random UUID prevents collisions, the sanitized name can't escape the folder
                //and the extension always matches the checked image type
                String fileName = PhotoValidator.safeFileName(file, extensions.get(i));
                Path target = directory.resolve(fileName);

                //no REPLACE_EXISTING: an existing photo is never overwritten
                try (InputStream in = file.getInputStream()) {
                    Files.copy(in, target);
                }
                written.add(target);
                urls.add(uploads.urlFor(fileName));
            }
            return urls;
        } catch (IOException e) {
            written.forEach(PhotoStorage::deleteQuietly);
            throw new RuntimeException("Could not save the photos in " + uploads.directory(), e);
        }
    }

    private static void deleteOnRollback(List<Path> written) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    written.forEach(PhotoStorage::deleteQuietly);
                }
            }
        });
    }

    private static void deleteQuietly(Path file) {
        try {
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.warn("Could not delete unused photo {}", file, e);
        }
    }
}
