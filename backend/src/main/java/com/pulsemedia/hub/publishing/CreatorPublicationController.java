package com.pulsemedia.hub.publishing;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pulsemedia.hub.publishing.PublishingDtos.Publication;
import com.pulsemedia.hub.security.CurrentUser;

/** Creators see the live links of their own videos ("My publications"). */
@RestController
public class CreatorPublicationController {

    private final PublishingService service;

    public CreatorPublicationController(PublishingService service) {
        this.service = service;
    }

    @GetMapping("/api/creator/publications")
    List<Publication> mine(@AuthenticationPrincipal CurrentUser user) {
        return service.creatorPublications(user.creatorId());
    }
}
