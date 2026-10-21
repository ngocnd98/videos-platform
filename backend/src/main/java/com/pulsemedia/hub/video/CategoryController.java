package com.pulsemedia.hub.video;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.pulsemedia.hub.common.ApiException;
import com.pulsemedia.hub.common.AuditLog;
import com.pulsemedia.hub.security.CurrentUser;
import com.pulsemedia.hub.video.VideoDtos.AdminCategory;
import com.pulsemedia.hub.video.VideoDtos.Category;
import com.pulsemedia.hub.video.VideoDtos.CategoryUpdate;
import com.pulsemedia.hub.video.VideoDtos.NewCategory;

import jakarta.validation.Valid;

/** Hidden categories stay on existing videos but are no longer offered for new uploads. */
@RestController
public class CategoryController {

    private final VideoRepository videos;
    private final AuditLog audit;

    public CategoryController(VideoRepository videos, AuditLog audit) {
        this.videos = videos;
        this.audit = audit;
    }

    @GetMapping("/api/categories")
    List<Category> categories() {
        return videos.categories();
    }

    @GetMapping("/api/admin/categories")
    List<AdminCategory> adminCategories() {
        return videos.adminCategories();
    }

    @PostMapping("/api/admin/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    AdminCategory create(@AuthenticationPrincipal CurrentUser admin, @Valid @RequestBody NewCategory body) {
        String name = body.name().trim();
        if (videos.categoryNameTaken(name, null)) {
            throw ApiException.conflict("That category already exists.");
        }
        long id = videos.insertCategory(name);
        audit.record("CATEGORY", String.valueOf(id), name, "Category created", "Category added to upload choices.", admin.id());
        return videos.adminCategory(id).orElseThrow();
    }

    @PatchMapping("/api/admin/categories/{id}")
    @Transactional
    AdminCategory update(@AuthenticationPrincipal CurrentUser admin, @PathVariable long id, @Valid @RequestBody CategoryUpdate body) {
        AdminCategory current = videos.adminCategory(id).orElseThrow(() -> ApiException.notFound("Category not found."));
        String name = body.name() == null ? current.name() : body.name().trim();
        if (name.isEmpty()) {
            throw ApiException.badRequest("Enter a category name.");
        }
        if (!name.equals(current.name()) && videos.categoryNameTaken(name, id)) {
            throw ApiException.conflict("That category already exists.");
        }
        boolean visible = body.visible() == null ? current.visible() : body.visible();
        videos.updateCategory(id, name, visible);
        if (!name.equals(current.name())) {
            audit.record("CATEGORY", String.valueOf(id), name, "Category renamed",
                    "Renamed from " + current.name() + "; existing videos keep their category.", admin.id());
        }
        if (visible != current.visible()) {
            audit.record("CATEGORY", String.valueOf(id), name, visible ? "Category shown" : "Category hidden",
                    "Visibility changed for new uploads.", admin.id());
        }
        return videos.adminCategory(id).orElseThrow();
    }
}
