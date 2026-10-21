package com.pulsemedia.hub.review;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ReviewDtos {

    private ReviewDtos() {
    }

    public record QueueItem(String code, String title, String creator, Long categoryId, String category,
                            Integer durationSec, String thumbColor, String thumbnailUrl, String submittedAt,
                            String creatorCountry, String tags) {
    }

    public record ReviewDetail(String code, String title, String description, String tags, String status,
                               String creator, String category, Integer durationSec, String thumbColor,
                               String thumbnailUrl, String previewUrl, String fileName, Long sizeBytes,
                               String submittedAt) {
    }

    public record InfoCorrection(@NotBlank @Size(max = 100) String title, @NotNull Long categoryId,
                                 @Size(max = 200) String tags) {
    }

    public record RejectRequest(@NotBlank String reason, @Size(max = 300) String note) {
    }

    public record AuditEntry(long id, String entity, String entityId, String title, String action, String detail,
                             String actor, String createdAt) {
    }
}
