package com.pulsemedia.hub.publishing;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public final class PublishingDtos {

    private PublishingDtos() {
    }

    public record PlatformLink(String platform, String url, String note, String publishedAt) {
    }

    public record PublishingVideo(String code, String title, String creator, String status, String thumbColor,
                                  String thumbnailUrl, boolean hasOriginal, String approvedAt,
                                  String firstPublishedAt, List<PlatformLink> platforms) {
    }

    public record PlatformSummary(String platform, int videos, long views) {
    }

    public record PublicationInput(@NotBlank String platform, @NotBlank @Size(max = 500) String url) {
    }

    public record PublishRequest(@NotEmpty @Size(max = 3) List<@Valid PublicationInput> publications,
                                 @Size(max = 500) String note) {
    }

    public record DownloadUrl(String url, String fileName) {
    }
}
