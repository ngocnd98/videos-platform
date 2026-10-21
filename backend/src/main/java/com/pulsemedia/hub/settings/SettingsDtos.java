package com.pulsemedia.hub.settings;

import java.util.List;

import jakarta.validation.constraints.NotNull;

public final class SettingsDtos {

    private SettingsDtos() {
    }

    public record PlatformSetting(String name, boolean enabled) {
    }

    public record Settings(int uploadLimitGb, int storageQuotaGb, int defaultSharePct, int retentionDays,
                           List<PlatformSetting> platforms) {
    }

    public record SettingsUpdate(@NotNull Integer uploadLimitGb, @NotNull Integer storageQuotaGb,
                                 @NotNull Integer defaultSharePct, @NotNull Integer retentionDays,
                                 @NotNull List<String> enabledPlatforms) {
    }

    public record StorageUsage(int originalFiles, long usedBytes) {
    }
}
