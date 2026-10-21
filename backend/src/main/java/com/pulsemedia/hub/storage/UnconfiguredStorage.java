package com.pulsemedia.hub.storage;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;

import com.pulsemedia.hub.common.ApiException;

/** Used when R2 env vars are missing, so the rest of the app still runs. */
class UnconfiguredStorage implements ObjectStorage {

    private static ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "File storage is not configured on this server.");
    }

    @Override
    public boolean isConfigured() {
        return false;
    }

    @Override
    public String createMultipartUpload(String key, String contentType) {
        throw unavailable();
    }

    @Override
    public String presignUploadPart(String key, String uploadId, int partNumber) {
        throw unavailable();
    }

    @Override
    public Optional<List<UploadedPart>> listParts(String key, String uploadId) {
        throw unavailable();
    }

    @Override
    public void completeMultipartUpload(String key, String uploadId, List<UploadedPart> parts) {
        throw unavailable();
    }

    @Override
    public void abortMultipartUpload(String key, String uploadId) {
        throw unavailable();
    }

    @Override
    public Optional<Long> objectSize(String key) {
        throw unavailable();
    }

    @Override
    public void putObject(String key, byte[] data, String contentType) {
        throw unavailable();
    }

    @Override
    public String presignGet(String key, String downloadFileName) {
        throw unavailable();
    }
}
