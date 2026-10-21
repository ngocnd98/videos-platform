package com.pulsemedia.hub.creator;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pulsemedia.hub.common.ApiException;
import com.pulsemedia.hub.common.AuditLog;
import com.pulsemedia.hub.creator.CreatorProfileDtos.CreatorAccount;
import com.pulsemedia.hub.creator.CreatorProfileDtos.CreatorAccountUpdate;
import com.pulsemedia.hub.creator.CreatorProfileDtos.PublicProfile;
import com.pulsemedia.hub.creator.CreatorProfileDtos.PublicVideo;
import com.pulsemedia.hub.security.CurrentUser;
import com.pulsemedia.hub.storage.ObjectStorage;

import jakarta.validation.Valid;

/** The creator's own account, payout details and a preview of their public page. */
@RestController
@RequestMapping("/api/creator")
public class CreatorProfileController {

    private static final String SLUG_PATTERN = "^[a-z0-9-]{3,60}$";

    private final CreatorProfileRepository repo;
    private final PasswordEncoder passwordEncoder;
    private final ObjectStorage storage;
    private final AuditLog audit;

    public CreatorProfileController(CreatorProfileRepository repo, PasswordEncoder passwordEncoder, ObjectStorage storage,
                                    AuditLog audit) {
        this.repo = repo;
        this.passwordEncoder = passwordEncoder;
        this.storage = storage;
        this.audit = audit;
    }

    @GetMapping("/profile")
    CreatorAccount profile(@AuthenticationPrincipal CurrentUser user) {
        return repo.account(user.creatorId());
    }

    /** Email is read-only here: the demo's Admin/Creator switch signs in with the seeded addresses. */
    @PutMapping("/profile")
    @Transactional
    CreatorAccount update(@AuthenticationPrincipal CurrentUser user, @Valid @RequestBody CreatorAccountUpdate body) {
        String slug = body.slug().trim().toLowerCase();
        if (!slug.matches(SLUG_PATTERN)) {
            throw ApiException.badRequest("Use 3–60 lowercase letters, numbers or hyphens for the profile URL.");
        }
        if (repo.slugTaken(slug, user.creatorId())) {
            throw ApiException.conflict("That profile URL is taken.");
        }
        boolean passwordChange = body.newPassword() != null && !body.newPassword().isEmpty();
        if (passwordChange && body.newPassword().length() < 8) {
            throw ApiException.badRequest("Use at least 8 characters for the new password.");
        }
        repo.update(user.creatorId(), user.id(), body, slug);
        if (passwordChange) {
            repo.updatePassword(user.id(), passwordEncoder.encode(body.newPassword()));
        }
        CreatorAccount account = repo.account(user.creatorId());
        audit.record("CREATOR", account.creatorCode(), account.displayName(), "Creator profile updated",
                "Public profile and payout details updated" + (passwordChange ? "; password changed." : "."), user.id());
        return account;
    }

    @GetMapping("/public-profile")
    PublicProfile publicProfile(@AuthenticationPrincipal CurrentUser user) {
        CreatorAccount a = repo.account(user.creatorId());
        boolean hidden = a.publicHidden() || "SUSPENDED".equals(a.status());
        List<PublicVideo> videos = hidden ? List.of() : repo.publicVideos(user.creatorId()).stream()
                .map(v -> new PublicVideo(v.code(), v.title(), v.category(), v.description(), v.tags(), v.views(),
                        v.platform(), v.url(), v.publishedAt(), v.thumbColor(),
                        v.thumbnailKey() != null && storage.isConfigured() ? storage.presignGet(v.thumbnailKey(), null) : null))
                .toList();
        long totalViews = videos.stream().mapToLong(PublicVideo::views).sum();
        return new PublicProfile(hidden, a.displayName(), a.slug(), a.country(), a.bio(), a.socialLinks(), totalViews, videos);
    }
}
