package com.pulsemedia.hub.storage;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.pulsemedia.hub.config.AppProperties;

/**
 * Builds object keys. Each boot gets its own prefix because the SQLite database is
 * recreated on restart; old objects are left for the bucket lifecycle rule to expire.
 */
@Component
public class StorageKeys {

    private final String bootPrefix;

    public StorageKeys(AppProperties props) {
        String date = LocalDate.now().toString();
        this.bootPrefix = props.r2().uploadPrefix() + "/" + date + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    public String bootPrefix() {
        return bootPrefix;
    }

    public String original(String videoCode, String fileName) {
        return bootPrefix + "/videos/" + videoCode + "/original/" + sanitize(fileName);
    }

    public String thumbnail(String videoCode) {
        return bootPrefix + "/videos/" + videoCode + "/thumbnail.jpg";
    }

    private static String sanitize(String fileName) {
        String cleaned = fileName == null ? "" : fileName.replaceAll("[^A-Za-z0-9._-]", "_");
        return cleaned.isBlank() ? "video.mp4" : cleaned;
    }
}
