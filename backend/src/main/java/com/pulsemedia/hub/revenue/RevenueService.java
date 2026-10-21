package com.pulsemedia.hub.revenue;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pulsemedia.hub.common.ApiException;
import com.pulsemedia.hub.common.AuditLog;
import com.pulsemedia.hub.revenue.RevenueDtos.CreatorBalance;
import com.pulsemedia.hub.revenue.RevenueDtos.ImportResult;
import com.pulsemedia.hub.revenue.RevenueDtos.NewEntry;
import com.pulsemedia.hub.revenue.RevenueDtos.MarkPaid;
import com.pulsemedia.hub.revenue.RevenueDtos.NewPayout;
import com.pulsemedia.hub.revenue.RevenueDtos.Payout;
import com.pulsemedia.hub.revenue.RevenueDtos.PayoutPreview;
import com.pulsemedia.hub.revenue.RevenueDtos.RevenueEntry;
import com.pulsemedia.hub.revenue.RevenueDtos.RevenuePage;
import com.pulsemedia.hub.revenue.RevenueDtos.Statement;
import com.pulsemedia.hub.revenue.RevenueDtos.StatementLine;
import com.pulsemedia.hub.revenue.RevenueDtos.Totals;
import com.pulsemedia.hub.revenue.RevenueRepository.CreatorInfo;
import com.pulsemedia.hub.revenue.RevenueRepository.PublishedOn;
import com.pulsemedia.hub.security.CurrentUser;
import com.pulsemedia.hub.settings.SettingsService;

/**
 * Revenue is entered per video, platform and month. The creator's split is copied onto each entry
 * when it is recorded, so later contract changes never rewrite history. Payouts settle all unpaid
 * entries of a creator; the money itself moves outside the system.
 */
@Service
public class RevenueService {

    private static final int MAX_IMPORT_ROWS = 5_000;

    private final RevenueRepository repo;
    private final AuditLog audit;
    private final SettingsService settings;

    public RevenueService(RevenueRepository repo, AuditLog audit, SettingsService settings) {
        this.repo = repo;
        this.audit = audit;
        this.settings = settings;
    }

    public RevenuePage page(String period) {
        List<RevenueEntry> entries = repo.entries(period);
        return new RevenuePage(entries, totals(entries), repo.periods());
    }

    @Transactional
    public RevenueEntry add(CurrentUser admin, NewEntry req) {
        settings.requireEnabled(req.platform());
        PublishedOn target = publishedOn(req.videoCode(), req.platform());
        requireNoDuplicate(target, req.platform(), req.period());
        long gross = toCents(req.gross());
        long id = repo.insert(target, req.period(), gross, share(gross, target.splitPct()), admin.id());
        audit.record("REVENUE", target.code(), target.title(), "Revenue added",
                req.platform() + " · " + req.period() + " · $" + req.gross().setScale(2, RoundingMode.HALF_UP), admin.id());
        return repo.entry(id).orElseThrow();
    }

    @Transactional
    public RevenueEntry updateGross(long id, BigDecimal gross) {
        RevenueEntry e = unpaid(id);
        long cents = toCents(gross);
        repo.updateGross(id, cents, share(cents, e.splitPct()));
        return repo.entry(id).orElseThrow();
    }

    @Transactional
    public void delete(long id) {
        unpaid(id);
        repo.delete(id);
    }

    /**
     * Imports a CSV with columns Video ID or Video title, Platform, Gross revenue and optionally Period.
     * Either every row is valid and imported, or nothing is and all problems are reported.
     */
    @Transactional
    public ImportResult importCsv(CurrentUser admin, String csv, String defaultPeriod) {
        List<List<String>> rows;
        try {
            rows = CsvParser.parse(csv);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest(e.getMessage());
        }
        if (rows.size() < 2) {
            throw ApiException.badRequest("No revenue rows found.");
        }
        if (rows.size() - 1 > MAX_IMPORT_ROWS) {
            throw ApiException.badRequest("Import at most " + MAX_IMPORT_ROWS + " rows at a time.");
        }
        List<String> header = rows.get(0).stream().map(h -> h.toLowerCase(Locale.ROOT).replaceAll("[^a-z]", "")).toList();
        int codeCol = indexOf(header, "videoid", "id", "code");
        int titleCol = indexOf(header, "videotitle", "title");
        int platformCol = indexOf(header, "platform");
        int grossCol = indexOf(header, "grossrevenue", "gross", "revenue");
        int periodCol = indexOf(header, "period", "month");
        if ((codeCol < 0 && titleCol < 0) || platformCol < 0 || grossCol < 0) {
            throw ApiException.badRequest("Required columns: Video ID or Video title, Platform, Gross revenue.");
        }
        if (periodCol < 0 && (defaultPeriod == null || !defaultPeriod.matches(RevenueDtos.PERIOD_PATTERN))) {
            throw ApiException.badRequest("Add a Period column (YYYY-MM) or choose the month for this import.");
        }

        record Parsed(PublishedOn target, String platform, String period, long gross) {
        }
        List<Parsed> parsed = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        Set<String> enabled = new HashSet<>();
        settings.platforms().stream().filter(p -> p.enabled()).forEach(p -> enabled.add(p.name()));
        for (int i = 1; i < rows.size(); i++) {
            List<String> row = rows.get(i);
            String line = "Row " + (i + 1) + ": ";
            String platform = normalizePlatform(cell(row, platformCol));
            String period = periodCol >= 0 && !cell(row, periodCol).isBlank() ? cell(row, periodCol).trim() : defaultPeriod;
            BigDecimal gross = parseMoney(cell(row, grossCol));
            String code = codeCol >= 0 ? cell(row, codeCol).trim() : "";
            if (code.isEmpty() && titleCol >= 0) {
                List<String> matches = repo.codesByTitle(cell(row, titleCol));
                if (matches.size() > 1) {
                    errors.add(line + "several published videos are titled “" + cell(row, titleCol).trim() + "”; add the Video ID.");
                    continue;
                }
                code = matches.isEmpty() ? "" : matches.get(0);
            }
            if (code.isEmpty()) {
                errors.add(line + "no published video matches “" + (titleCol >= 0 ? cell(row, titleCol).trim() : "") + "”.");
            } else if (platform == null) {
                errors.add(line + "platform must be YouTube, TikTok or Instagram.");
            } else if (!enabled.contains(platform)) {
                errors.add(line + platform + " is disabled in settings.");
            } else if (period == null || !period.matches(RevenueDtos.PERIOD_PATTERN)) {
                errors.add(line + "period must look like 2026-10.");
            } else if (gross == null || gross.signum() < 0 || gross.scale() > 2) {
                errors.add(line + "gross revenue must be a non-negative amount with at most 2 decimals.");
            } else {
                var target = repo.publishedOn(code, platform);
                if (target.isEmpty()) {
                    errors.add(line + code + " is not published on " + platform + ".");
                } else if (!seen.add(code + "|" + platform + "|" + period) || repo.exists(target.get().videoId(), target.get().platformId(), period)) {
                    errors.add(line + code + " already has " + platform + " revenue for " + period + ".");
                } else {
                    parsed.add(new Parsed(target.get(), platform, period, toCents(gross)));
                }
            }
        }
        if (!errors.isEmpty()) {
            throw ApiException.badRequest("Nothing was imported. " + String.join(" ", errors.subList(0, Math.min(errors.size(), 10)))
                    + (errors.size() > 10 ? " …and " + (errors.size() - 10) + " more." : ""));
        }
        for (Parsed p : parsed) {
            repo.insert(p.target(), p.period(), p.gross(), share(p.gross(), p.target().splitPct()), admin.id());
        }
        long gross = parsed.stream().mapToLong(Parsed::gross).sum();
        long creator = parsed.stream().mapToLong(p -> share(p.gross(), p.target().splitPct())).sum();
        audit.record("REVENUE", "IMPORT", "Revenue import", "Imported", parsed.size() + " rows · $" + BigDecimal.valueOf(gross, 2), admin.id());
        return new ImportResult(parsed.size(), new Totals(gross, creator, gross - creator));
    }

    // --- Payouts -------------------------------------------------------------------------

    public List<CreatorBalance> balances() {
        return repo.balances();
    }

    public List<Payout> payouts() {
        return repo.payouts(100);
    }

    public List<Payout> creatorPayouts(long creatorId) {
        return repo.creatorPayouts(creatorId);
    }

    public PayoutPreview preview(long creatorId, String period) {
        CreatorInfo creator = repo.creator(creatorId).orElseThrow(() -> ApiException.notFound("Creator not found."));
        long[] eligible = repo.eligible(creatorId, period);
        return new PayoutPreview(creatorId, period, (int) eligible[0], eligible[1], creator.payoutMethod());
    }

    /** Step 1: group a creator's unpaid entries for one month into a PENDING payout. */
    @Transactional
    public Payout createPayout(CurrentUser admin, NewPayout req) {
        CreatorInfo creator = repo.creator(req.creatorId()).orElseThrow(() -> ApiException.notFound("Creator not found."));
        if (!"ACTIVE".equals(creator.status())) {
            throw ApiException.conflict("Select an active creator.");
        }
        if (creator.payoutMethod() == null || creator.payoutMethod().isBlank()) {
            throw ApiException.conflict("Add payout details to the creator profile before creating a payout.");
        }
        long[] eligible = repo.eligible(creator.id(), req.period());
        if (eligible[0] == 0 || eligible[1] <= 0) {
            throw ApiException.conflict("There are no unpaid revenue lines for this creator and period.");
        }
        Payout payout = repo.payout(repo.createPending(creator.id(), req.period(), eligible[1])).orElseThrow();
        audit.record("PAYOUT", payout.payoutCode(), creator.name(), "Payout created",
                creator.name() + " · " + dollars(payout.amountCents()) + " · " + req.period(), admin.id());
        return payout;
    }

    /** Step 2: record the external transfer. Paid entries are locked from then on. */
    @Transactional
    public Payout markPaid(CurrentUser admin, long id, MarkPaid req) {
        Payout payout = pendingPayout(id);
        String remarks = req.remarks() == null || req.remarks().isBlank() ? null : req.remarks().trim();
        if (!repo.markPaid(id, req.externalRef().trim(), remarks)) {
            throw ApiException.conflict("Only pending payouts can be changed.");
        }
        audit.record("PAYOUT", payout.payoutCode(), payout.creator(), "Payout marked paid",
                payout.creator() + " · " + dollars(payout.amountCents()) + " · Ref " + req.externalRef().trim(), admin.id());
        return repo.payout(id).orElseThrow();
    }

    @Transactional
    public Payout cancel(CurrentUser admin, long id) {
        Payout payout = pendingPayout(id);
        if (!repo.cancel(id)) {
            throw ApiException.conflict("Only pending payouts can be changed.");
        }
        audit.record("PAYOUT", payout.payoutCode(), payout.creator(), "Payout cancelled",
                payout.creator() + " · " + dollars(payout.amountCents()), admin.id());
        return repo.payout(id).orElseThrow();
    }

    private Payout pendingPayout(long id) {
        Payout payout = repo.payout(id).orElseThrow(() -> ApiException.notFound("Payout not found."));
        if (!"PENDING".equals(payout.status())) {
            throw ApiException.conflict("Only pending payouts can be changed.");
        }
        return payout;
    }

    private static String dollars(long cents) {
        return "$" + BigDecimal.valueOf(cents, 2);
    }

    public Statement statement(long creatorId, String period) {
        String month = period == null ? YearMonth.now(ZoneOffset.UTC).toString() : period;
        if (!month.matches(RevenueDtos.PERIOD_PATTERN)) {
            throw ApiException.badRequest("period must look like 2026-10.");
        }
        CreatorInfo c = repo.creator(creatorId).orElseThrow(() -> ApiException.notFound("Creator not found."));
        List<RevenueEntry> entries = repo.creatorEntries(creatorId, month);
        List<StatementLine> lines = entries.stream()
                .map(e -> new StatementLine(e.videoCode(), e.videoTitle(), e.platform(), e.grossCents(), e.splitPct(),
                        e.creatorShareCents(), e.status()))
                .toList();
        long paid = entries.stream().filter(e -> "PAID".equals(e.status())).mapToLong(RevenueEntry::creatorShareCents).sum();
        Totals totals = totals(entries);
        return new Statement(month, c.name(), c.creatorCode(), c.country(), c.payoutMethod(), lines, totals,
                paid, totals.creatorCents() - paid, Instant.now().toString());
    }

    // --- helpers -------------------------------------------------------------------------

    private PublishedOn publishedOn(String code, String platform) {
        return repo.publishedOn(code, platform)
                .orElseThrow(() -> ApiException.badRequest(code + " is not published on " + platform + "."));
    }

    private void requireNoDuplicate(PublishedOn target, String platform, String period) {
        if (repo.exists(target.videoId(), target.platformId(), period)) {
            throw ApiException.conflict(target.code() + " already has " + platform + " revenue for " + period + ". Edit that entry instead.");
        }
    }

    private RevenueEntry unpaid(long id) {
        RevenueEntry e = repo.entry(id).orElseThrow(() -> ApiException.notFound("Revenue entry not found."));
        if (e.payoutId() != null) {
            throw ApiException.conflict("This entry is part of a payout and can no longer be changed.");
        }
        return e;
    }

    static long share(long grossCents, double splitPct) {
        return BigDecimal.valueOf(grossCents).multiply(BigDecimal.valueOf(splitPct))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).longValueExact();
    }

    private static long toCents(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.UNNECESSARY).movePointRight(2).longValueExact();
    }

    private static Totals totals(List<RevenueEntry> entries) {
        long gross = entries.stream().mapToLong(RevenueEntry::grossCents).sum();
        long creator = entries.stream().mapToLong(RevenueEntry::creatorShareCents).sum();
        return new Totals(gross, creator, gross - creator);
    }

    private static int indexOf(List<String> header, String... names) {
        for (String n : names) {
            int i = header.indexOf(n);
            if (i >= 0) {
                return i;
            }
        }
        return -1;
    }

    private static String cell(List<String> row, int col) {
        return col >= 0 && col < row.size() ? row.get(col) : "";
    }

    private static String normalizePlatform(String raw) {
        String p = raw.toLowerCase(Locale.ROOT);
        return p.contains("youtube") ? "YouTube" : p.contains("tiktok") ? "TikTok" : p.contains("instagram") ? "Instagram" : null;
    }

    private static BigDecimal parseMoney(String raw) {
        try {
            String cleaned = raw.replaceAll("[$,\\s]", "");
            return cleaned.isEmpty() ? null : new BigDecimal(cleaned);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
