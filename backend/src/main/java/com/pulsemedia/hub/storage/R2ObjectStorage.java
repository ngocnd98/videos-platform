package com.pulsemedia.hub.storage;

import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import com.pulsemedia.hub.config.AppProperties;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.CompletedMultipartUpload;
import software.amazon.awssdk.services.s3.model.CompletedPart;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.NoSuchUploadException;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * Cloudflare R2 through the S3 API. R2 uses region "auto" and does not support the SDK's
 * default CRC checksums, so checksums are only sent when an operation requires them.
 */
class R2ObjectStorage implements ObjectStorage, AutoCloseable {

    private final S3Client s3;
    private final S3Presigner presigner;
    private final String bucket;
    private final Duration presignTtl;

    R2ObjectStorage(AppProperties.R2 r2) {
        var credentials = StaticCredentialsProvider.create(AwsBasicCredentials.create(r2.accessKey(), r2.secretKey()));
        URI endpoint = URI.create(r2.endpoint());
        this.s3 = S3Client.builder()
                .endpointOverride(endpoint)
                .region(Region.of("auto"))
                .credentialsProvider(credentials)
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
                .build();
        this.presigner = S3Presigner.builder()
                .endpointOverride(endpoint)
                .region(Region.of("auto"))
                .credentialsProvider(credentials)
                .serviceConfiguration(S3Configuration.builder().checksumValidationEnabled(false).build())
                .build();
        this.bucket = r2.bucket();
        this.presignTtl = r2.presignTtl();
    }

    @Override
    public String createMultipartUpload(String key, String contentType) {
        return s3.createMultipartUpload(b -> b.bucket(bucket).key(key).contentType(contentType)).uploadId();
    }

    @Override
    public String presignUploadPart(String key, String uploadId, int partNumber) {
        return presigner.presignUploadPart(p -> p
                        .signatureDuration(presignTtl)
                        .uploadPartRequest(r -> r.bucket(bucket).key(key).uploadId(uploadId).partNumber(partNumber)))
                .url().toString();
    }

    @Override
    public Optional<List<UploadedPart>> listParts(String key, String uploadId) {
        try {
            List<UploadedPart> parts = new ArrayList<>();
            s3.listPartsPaginator(b -> b.bucket(bucket).key(key).uploadId(uploadId))
                    .parts()
                    .forEach(p -> parts.add(new UploadedPart(p.partNumber(), p.eTag(), p.size())));
            return Optional.of(parts);
        } catch (NoSuchUploadException e) {
            return Optional.empty();
        }
    }

    @Override
    public void completeMultipartUpload(String key, String uploadId, List<UploadedPart> parts) {
        List<CompletedPart> completed = parts.stream()
                .sorted(Comparator.comparingInt(UploadedPart::partNumber))
                .map(p -> CompletedPart.builder().partNumber(p.partNumber()).eTag(p.etag()).build())
                .toList();
        s3.completeMultipartUpload(b -> b.bucket(bucket).key(key).uploadId(uploadId)
                .multipartUpload(CompletedMultipartUpload.builder().parts(completed).build()));
    }

    @Override
    public void abortMultipartUpload(String key, String uploadId) {
        try {
            s3.abortMultipartUpload(b -> b.bucket(bucket).key(key).uploadId(uploadId));
        } catch (NoSuchUploadException e) {
            // Already gone.
        }
    }

    @Override
    public Optional<Long> objectSize(String key) {
        try {
            return Optional.of(s3.headObject(b -> b.bucket(bucket).key(key)).contentLength());
        } catch (NoSuchKeyException e) {
            return Optional.empty();
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                return Optional.empty();
            }
            throw e;
        }
    }

    @Override
    public void putObject(String key, byte[] data, String contentType) {
        s3.putObject(b -> b.bucket(bucket).key(key).contentType(contentType), RequestBody.fromBytes(data));
    }

    @Override
    public String presignGet(String key, String downloadFileName) {
        return presigner.presignGetObject(p -> p
                        .signatureDuration(presignTtl)
                        .getObjectRequest(r -> {
                            r.bucket(bucket).key(key);
                            if (downloadFileName != null) {
                                r.responseContentDisposition("attachment; filename=\"" + downloadFileName.replace("\"", "") + "\"");
                            }
                        }))
                .url().toString();
    }

    @Override
    public void close() {
        s3.close();
        presigner.close();
    }
}
