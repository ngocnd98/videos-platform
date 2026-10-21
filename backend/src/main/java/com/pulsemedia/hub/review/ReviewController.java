package com.pulsemedia.hub.review;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.pulsemedia.hub.review.ReviewDtos.AuditEntry;
import com.pulsemedia.hub.review.ReviewDtos.InfoCorrection;
import com.pulsemedia.hub.review.ReviewDtos.QueueItem;
import com.pulsemedia.hub.review.ReviewDtos.RejectRequest;
import com.pulsemedia.hub.review.ReviewDtos.ReviewDetail;
import com.pulsemedia.hub.security.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin")
public class ReviewController {

    private final ReviewService service;
    private final ReviewRepository reviews;

    public ReviewController(ReviewService service, ReviewRepository reviews) {
        this.service = service;
        this.reviews = reviews;
    }

    @GetMapping("/reviews")
    List<QueueItem> queue() {
        return service.queue();
    }

    @GetMapping("/reviews/reasons")
    List<String> reasons() {
        return ReviewService.REJECTION_REASONS;
    }

    @GetMapping("/reviews/{code}")
    ReviewDetail detail(@PathVariable String code) {
        return service.detail(code);
    }

    @PatchMapping("/reviews/{code}")
    ReviewDetail correct(@AuthenticationPrincipal CurrentUser admin, @PathVariable String code,
                         @Valid @RequestBody InfoCorrection body) {
        return service.correctInfo(admin, code, body);
    }

    @PostMapping("/videos/{code}/approve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void approve(@AuthenticationPrincipal CurrentUser admin, @PathVariable String code) {
        service.approve(admin, code);
    }

    @PostMapping("/videos/{code}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void reject(@AuthenticationPrincipal CurrentUser admin, @PathVariable String code, @Valid @RequestBody RejectRequest body) {
        service.reject(admin, code, body);
    }

    @GetMapping("/audit")
    List<AuditEntry> audit(@RequestParam(defaultValue = "50") int limit) {
        return reviews.audit(Math.min(Math.max(limit, 1), 200));
    }
}
