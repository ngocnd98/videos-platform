package com.pulsemedia.hub.settings;

import java.util.HashSet;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pulsemedia.hub.common.ApiException;
import com.pulsemedia.hub.common.AuditLog;
import com.pulsemedia.hub.security.CurrentUser;
import com.pulsemedia.hub.settings.SettingsDtos.PlatformSetting;
import com.pulsemedia.hub.settings.SettingsDtos.Settings;
import com.pulsemedia.hub.settings.SettingsDtos.SettingsUpdate;

/** Workspace-wide settings kept as key/value rows; platform switches live on the platforms table. */
@Service
public class SettingsService {

    private static final List<String> PLATFORMS = List.of("YouTube", "TikTok", "Instagram");

    private final SettingsRepository repo;
    private final AuditLog audit;

    public SettingsService(SettingsRepository repo, AuditLog audit) {
        this.repo = repo;
        this.audit = audit;
    }

    public Settings get() {
        Map<String, String> v = repo.values();
        return new Settings(intValue(v, "upload_limit_gb", 2), intValue(v, "storage_quota_gb", 300),
                intValue(v, "default_share_pct", 60), intValue(v, "retention_days", 90), repo.platforms());
    }

    @Transactional
    public Settings update(CurrentUser admin, SettingsUpdate req) {
        boolean valid = req.uploadLimitGb() >= 1 && req.uploadLimitGb() <= 20 && req.storageQuotaGb() >= 1
                && req.defaultSharePct() >= 0 && req.defaultSharePct() <= 100 && req.retentionDays() >= 1
                && !req.enabledPlatforms().isEmpty() && PLATFORMS.containsAll(req.enabledPlatforms());
        if (!valid) {
            throw ApiException.badRequest("Check the settings values and select at least one platform.");
        }
        repo.put("upload_limit_gb", String.valueOf(req.uploadLimitGb()));
        repo.put("storage_quota_gb", String.valueOf(req.storageQuotaGb()));
        repo.put("default_share_pct", String.valueOf(req.defaultSharePct()));
        repo.put("retention_days", String.valueOf(req.retentionDays()));
        repo.setEnabledPlatforms(List.copyOf(new HashSet<>(req.enabledPlatforms())));
        audit.record("SETTINGS", "PLATFORM", "Platform settings", "Settings updated",
                "Upload limit " + req.uploadLimitGb() + " GB; quota " + req.storageQuotaGb() + " GB; retention "
                        + req.retentionDays() + " days; default share " + req.defaultSharePct() + "%.", admin.id());
        return get();
    }

    public long uploadLimitBytes() {
        return get().uploadLimitGb() * 1024L * 1024 * 1024;
    }

    public int defaultSharePct() {
        return get().defaultSharePct();
    }

    /** Publishing and revenue only accept platforms switched on in settings. */
    public void requireEnabled(String platform) {
        boolean disabled = repo.platforms().stream().anyMatch(p -> p.name().equals(platform) && !p.enabled());
        if (disabled) {
            throw ApiException.badRequest(platform + " is disabled in settings.");
        }
    }

    public List<PlatformSetting> platforms() {
        return repo.platforms();
    }

    private static int intValue(Map<String, String> values, String key, int fallback) {
        try {
            return Integer.parseInt(values.getOrDefault(key, String.valueOf(fallback)));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
}
