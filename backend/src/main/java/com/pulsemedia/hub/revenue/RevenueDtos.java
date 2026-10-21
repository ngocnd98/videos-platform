package com.pulsemedia.hub.revenue;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class RevenueDtos {

    private RevenueDtos() {
    }

    public static final String PERIOD_PATTERN = "^\\d{4}-(0[1-9]|1[0-2])$";

    public record RevenueEntry(long id, String videoCode, String videoTitle, String creator, long creatorId,
                               String platform, String period, long grossCents, double splitPct,
                               long creatorShareCents, String status, Long payoutId) {
    }

    public record Totals(long grossCents, long creatorCents, long platformCents) {
    }

    public record RevenuePage(List<RevenueEntry> entries, Totals totals, List<String> periods) {
    }

    public record NewEntry(@NotBlank String videoCode, @NotBlank String platform,
                           @NotBlank @Pattern(regexp = PERIOD_PATTERN) String period,
                           @NotNull @DecimalMin("0.00") @Digits(integer = 9, fraction = 2) BigDecimal gross) {
    }

    public record GrossUpdate(@NotNull @DecimalMin("0.00") @Digits(integer = 9, fraction = 2) BigDecimal gross) {
    }

    public record ImportResult(int imported, Totals totals) {
    }

    public record CreatorBalance(long creatorId, String creator, String creatorCode, String payoutMethod,
                                 int entries, long pendingCents) {
    }

    public record Payout(long id, long creatorId, String creator, long amountCents, String status,
                         String externalRef, String remarks, String paidAt, int entries) {
    }

    public record NewPayout(@NotNull Long creatorId, @NotBlank @Size(max = 100) String externalRef,
                            @Size(max = 300) String remarks) {
    }

    public record StatementLine(String videoCode, String videoTitle, String platform, long grossCents,
                                double splitPct, long creatorShareCents, String status) {
    }

    public record Statement(String period, String creator, String creatorCode, String country, String payoutMethod,
                            List<StatementLine> lines, Totals totals, long paidCents, long pendingCents,
                            String generatedAt) {
    }
}
