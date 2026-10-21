package com.pulsemedia.hub.settings;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.pulsemedia.hub.security.CurrentUser;
import com.pulsemedia.hub.settings.SettingsDtos.Settings;
import com.pulsemedia.hub.settings.SettingsDtos.SettingsUpdate;
import com.pulsemedia.hub.settings.SettingsDtos.StorageUsage;

import jakarta.validation.Valid;

@RestController
public class SettingsController {

    private final SettingsService service;
    private final SettingsRepository repo;

    public SettingsController(SettingsService service, SettingsRepository repo) {
        this.service = service;
        this.repo = repo;
    }

    /** Readable by creators too: the upload form needs the size limit and the category list. */
    @GetMapping("/api/settings")
    Settings get() {
        return service.get();
    }

    @PutMapping("/api/admin/settings")
    Settings update(@AuthenticationPrincipal CurrentUser admin, @Valid @RequestBody SettingsUpdate body) {
        return service.update(admin, body);
    }

    @GetMapping("/api/admin/storage")
    StorageUsage storage() {
        return repo.storage();
    }
}
