package com.pulsemedia.hub.video;

import java.util.List;

import com.pulsemedia.hub.storage.ObjectStorage.UploadedPart;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class VideoDtos {

    private VideoDtos() {
    }

    public record VideoMetadata(
            @NotBlank @Size(max = 100) String title,
            @Size(max = 500) String description,
            @NotNull Long categoryId,
            @Size(max = 200) String tags,
            @Min(0) Integer durationSec) {
    }

    public record VideoDto(
            String code,
            String title,
            String description,
            Long categoryId,
            String category,
            String tags,
            String status,
            Integer durationSec,
            long views,
            String thumbColor,
            String thumbnailUrl,
            String createdAt,
            String submittedAt,
            String rejectionReason,
            FileInfo original) {
    }

    public record FileInfo(String fileName, Long sizeBytes, String status) {
    }

    public record StartUploadRequest(@NotBlank @Size(max = 255) String fileName, @Positive long size, @NotBlank String contentType) {
    }

    public record UploadSession(String uploadId, String fileName, long size, long partSize, int partCount, List<UploadedPart> parts) {
    }

    public record PartUrlsRequest(@NotEmpty @Size(max = 100) List<@NotNull @Positive Integer> partNumbers) {
    }

    public record PartUrl(int partNumber, String url) {
    }

    public record CompletedPartDto(@Positive int partNumber, @NotBlank String etag) {
    }

    public record CompleteUploadRequest(@NotEmpty List<@Valid CompletedPartDto> parts) {
    }

    public record Category(long id, String name) {
    }
}
