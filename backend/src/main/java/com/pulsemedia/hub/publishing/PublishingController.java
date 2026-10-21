package com.pulsemedia.hub.publishing;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.pulsemedia.hub.publishing.PublishingDtos.DownloadUrl;
import com.pulsemedia.hub.publishing.PublishingDtos.PlatformSummary;
import com.pulsemedia.hub.publishing.PublishingDtos.PublishRequest;
import com.pulsemedia.hub.publishing.PublishingDtos.PublishingVideo;
import com.pulsemedia.hub.security.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin")
public class PublishingController {

    private final PublishingService service;
    private final PublishingRepository repo;

    public PublishingController(PublishingService service, PublishingRepository repo) {
        this.service = service;
        this.repo = repo;
    }

    @GetMapping("/publishing/videos")
    List<PublishingVideo> videos(@RequestParam(defaultValue = "PUBLISHED") String status) {
        return service.videos(status);
    }

    @GetMapping("/publishing/summary")
    List<PlatformSummary> summary() {
        return repo.summary();
    }

    @GetMapping(value = "/publishing/export.csv", produces = "text/csv")
    ResponseEntity<String> export() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"publishing-report.csv\"")
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .body(service.exportCsv());
    }

    @GetMapping("/videos/{code}/download-url")
    DownloadUrl downloadUrl(@PathVariable String code) {
        return service.downloadUrl(code);
    }

    @PostMapping("/videos/{code}/publications")
    PublishingVideo publish(@AuthenticationPrincipal CurrentUser admin, @PathVariable String code,
                            @Valid @RequestBody PublishRequest body) {
        return service.publish(admin, code, body);
    }
}
