package com.pulsemedia.hub.accounts;

import java.util.List;

import com.pulsemedia.hub.revenue.RevenueDtos.Payout;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class AccountsDtos {

    private AccountsDtos() {
    }

    public record WorkspaceUser(long id, String userCode, String name, String email, String role, String staffRole,
                                String status) {
    }

    public record NewAdmin(@NotBlank @Size(max = 80) String name, @NotBlank @Email @Size(max = 120) String email) {
    }

    public record StatusUpdate(@NotNull String status) {
    }

    public record AdminCreator(long creatorId, long userId, String creatorCode, String name, String email, String country,
                               String payoutMethod, double sharePct, String status, boolean publicHidden, int videos,
                               long unpaidCents) {
    }

    public record CreatorVideoSummary(String code, String title, String status, String createdAt) {
    }

    public record CreatorDetail(AdminCreator creator, List<CreatorVideoSummary> videos, List<Payout> payouts) {
    }

    public record CreatorUpdate(Double sharePct, String status, Boolean publicHidden) {
    }
}
