package com.pulsemedia.hub;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import com.pulsemedia.hub.storage.ObjectStorage;

/** In-memory stand-in for R2. Tests call {@link #receivePart} to play the browser's PUT. */
public class FakeObjectStorage implements ObjectStorage {

    private final Map<String, Map<Integer, UploadedPart>> uploads = new ConcurrentHashMap<>();
    private final Map<String, Long> objects = new ConcurrentHashMap<>();

    @Override
    public String createMultipartUpload(String key, String contentType) {
        String id = UUID.randomUUID().toString();
        uploads.put(id, new ConcurrentHashMap<>());
        return id;
    }

    @Override
    public String presignUploadPart(String key, String uploadId, int partNumber) {
        return "https://fake-r2/" + key + "?uploadId=" + uploadId + "&partNumber=" + partNumber;
    }

    public String receivePart(String uploadId, int partNumber, long size) {
        String etag = "\"etag-" + partNumber + "\"";
        uploads.get(uploadId).put(partNumber, new UploadedPart(partNumber, etag, size));
        return etag;
    }

    @Override
    public Optional<List<UploadedPart>> listParts(String key, String uploadId) {
        return Optional.ofNullable(uploads.get(uploadId)).map(m -> new ArrayList<>(m.values()));
    }

    @Override
    public void completeMultipartUpload(String key, String uploadId, List<UploadedPart> parts) {
        Map<Integer, UploadedPart> stored = uploads.remove(uploadId);
        objects.put(key, stored.values().stream().mapToLong(UploadedPart::size).sum());
    }

    @Override
    public void abortMultipartUpload(String key, String uploadId) {
        uploads.remove(uploadId);
    }

    @Override
    public Optional<Long> objectSize(String key) {
        return Optional.ofNullable(objects.get(key));
    }

    @Override
    public void putObject(String key, byte[] data, String contentType) {
        objects.put(key, (long) data.length);
    }

    @Override
    public String presignGet(String key, String downloadFileName) {
        return "https://fake-r2/" + key + (downloadFileName == null ? "" : "?download=" + downloadFileName);
    }
}
