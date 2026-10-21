package com.pulsemedia.hub.accounts;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.pulsemedia.hub.accounts.AccountsDtos.AdminCreator;
import com.pulsemedia.hub.accounts.AccountsDtos.CreatorDetail;
import com.pulsemedia.hub.accounts.AccountsDtos.CreatorUpdate;
import com.pulsemedia.hub.accounts.AccountsDtos.NewAdmin;
import com.pulsemedia.hub.accounts.AccountsDtos.StatusUpdate;
import com.pulsemedia.hub.accounts.AccountsDtos.WorkspaceUser;
import com.pulsemedia.hub.security.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin")
public class AccountsController {

    private final AccountsService service;

    public AccountsController(AccountsService service) {
        this.service = service;
    }

    @GetMapping("/users")
    List<WorkspaceUser> users() {
        return service.users();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    WorkspaceUser invite(@AuthenticationPrincipal CurrentUser admin, @Valid @RequestBody NewAdmin body) {
        return service.inviteAdmin(admin, body);
    }

    @PatchMapping("/users/{id}/status")
    WorkspaceUser status(@AuthenticationPrincipal CurrentUser admin, @PathVariable long id, @Valid @RequestBody StatusUpdate body) {
        return service.setAdminStatus(admin, id, body.status());
    }

    @GetMapping("/creators")
    List<AdminCreator> creators() {
        return service.creators();
    }

    @GetMapping("/creators/{creatorId}")
    CreatorDetail creator(@PathVariable long creatorId) {
        return service.creatorDetail(creatorId);
    }

    @PatchMapping("/creators/{creatorId}")
    AdminCreator update(@AuthenticationPrincipal CurrentUser admin, @PathVariable long creatorId, @RequestBody CreatorUpdate body) {
        return service.updateCreator(admin, creatorId, body);
    }
}
