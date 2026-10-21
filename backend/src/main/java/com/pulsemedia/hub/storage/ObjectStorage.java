package com.pulsemedia.hub.storage;

import java.util.List;
import java.util.Optional;

/** The subset of S3 operations the app needs. Implemented by R2 in production and by a fake in tests. */
public interface ObjectStorage {

    record UploadedPart(int partNumber, String etag, long size) {
    }

    default boolean isConfigured() {
        return true;
    }

    String createMultipartUpload(String key, String contentType);

    String presignUploadPart(String key, String uploadId, int partNumber);

    /** Parts already stored for this upload, or empty if the upload no longer exists (completed or aborted). */
    Optional<List<UploadedPart>> listParts(String key, String uploadId);

    void completeMultipartUpload(String key, String uploadId, List<UploadedPart> parts);

    void abortMultipartUpload(String key, String uploadId);

    Optional<Long> objectSize(String key);

    void putObject(String key, byte[] data, String contentType);

    /** Presigned GET. With a file name the response is sent as an attachment (download). */
    String presignGet(String key, String downloadFileName);
}
