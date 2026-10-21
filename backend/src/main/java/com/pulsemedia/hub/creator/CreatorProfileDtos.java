package com.pulsemedia.hub.creator;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class CreatorProfileDtos {

    private CreatorProfileDtos() {
    }

    public record CreatorAccount(String displayName, String email, String creatorCode, String slug, String country,
                                 String bio, String socialLinks, String payoutMethod, double sharePct,
                                 String contractSignedAt, String status, boolean publicHidden) {
    }

    public record CreatorAccountUpdate(@NotBlank @Size(max = 80) String displayName, @NotBlank String slug,
                                       @Size(max = 60) String country, @Size(max = 280) String bio,
                                       @Size(max = 200) String socialLinks, @Size(max = 120) String payoutMethod,
                                       @Size(max = 100) String newPassword) {
    }

    public record PublicVideo(String code, String title, String category, String description, String tags, long views,
                              String platform, String url, String publishedAt, String thumbColor, String thumbnailUrl) {
    }

    public record PublicProfile(boolean hidden, String displayName, String slug, String country, String bio,
                                String socialLinks, long totalViews, List<PublicVideo> videos) {
    }
}
