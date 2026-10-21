package com.pulsemedia.hub.cms;

import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pulsemedia.hub.common.ApiException;
import com.pulsemedia.hub.common.AuditLog;
import com.pulsemedia.hub.security.CurrentUser;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Public information pages (terms, privacy, about). The set of pages is fixed; admins edit their text. */
@RestController
@RequestMapping("/api/admin/cms")
public class CmsController {

    public record CmsPage(String slug, String title, String content, String updatedAt) {
    }

    public record CmsPageUpdate(@NotBlank @Size(max = 80) String title, @NotBlank @Size(max = 20_000) String content) {
    }

    private static final String SELECT = "SELECT slug, title, content, updated_at FROM cms_pages";

    private final JdbcClient jdbc;
    private final AuditLog audit;

    public CmsController(JdbcClient jdbc, AuditLog audit) {
        this.jdbc = jdbc;
        this.audit = audit;
    }

    @GetMapping
    List<CmsPage> pages() {
        return jdbc.sql(SELECT + " ORDER BY CASE slug WHEN 'terms' THEN 0 WHEN 'privacy' THEN 1 WHEN 'about' THEN 2 ELSE 3 END, title")
                .query(CmsPage.class).list();
    }

    @PutMapping("/{slug}")
    @Transactional
    CmsPage update(@AuthenticationPrincipal CurrentUser admin, @PathVariable String slug, @Valid @RequestBody CmsPageUpdate body) {
        int updated = jdbc.sql("""
                        UPDATE cms_pages SET title = ?, content = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                        WHERE slug = ?
                        """)
                .params(body.title().trim(), body.content(), slug).update();
        if (updated == 0) {
            throw ApiException.notFound("Page /" + slug + " not found.");
        }
        audit.record("CMS", slug, body.title().trim(), "CMS page updated", "/" + slug + " updated.", admin.id());
        return jdbc.sql(SELECT + " WHERE slug = ?").param(slug).query(CmsPage.class).single();
    }
}
