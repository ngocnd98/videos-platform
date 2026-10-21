package com.pulsemedia.hub.dashboard;

import java.time.Clock;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.pulsemedia.hub.common.ApiException;
import com.pulsemedia.hub.revenue.RevenueDtos.Totals;

/** Reports & analytics: gross revenue per platform and month, and how it splits between creators and the platform. */
@RestController
public class AnalyticsController {

    public record PlatformSeries(String platform, List<Long> grossCents) {
    }

    public record Analytics(List<String> months, List<PlatformSeries> series, Totals totals, long grossThisMonthCents,
                            long grossLastMonthCents, long totalViews, int avgSharePct) {
    }

    private record Cell(String platform, String month, long grossCents) {
    }

    private final JdbcClient jdbc;
    private final DashboardRepository dashboard;
    private final Clock clock = Clock.systemUTC();

    public AnalyticsController(JdbcClient jdbc, DashboardRepository dashboard) {
        this.jdbc = jdbc;
        this.dashboard = dashboard;
    }

    @GetMapping("/api/admin/analytics")
    Analytics analytics(@RequestParam(defaultValue = "6") int months) {
        if (months != 6 && months != 12) {
            throw ApiException.badRequest("months must be 6 or 12.");
        }
        YearMonth now = YearMonth.now(clock);
        List<String> labels = new ArrayList<>(months);
        for (YearMonth m = now.minusMonths(months - 1); !m.isAfter(now); m = m.plusMonths(1)) {
            labels.add(m.toString());
        }
        List<String> platforms = jdbc.sql("SELECT name FROM platforms ORDER BY id").query(String.class).list();
        List<Cell> cells = jdbc.sql("""
                        SELECT p.name AS platform, r.period_month AS month, sum(r.gross_cents) AS gross_cents
                        FROM revenue_entries r JOIN platforms p ON p.id = r.platform_id
                        WHERE r.period_month >= ? AND r.period_month <= ?
                        GROUP BY p.name, r.period_month
                        """)
                .params(labels.get(0), labels.get(labels.size() - 1)).query(Cell.class).list();
        List<PlatformSeries> series = platforms.stream().map(platform -> new PlatformSeries(platform, labels.stream()
                .map(month -> cells.stream().filter(c -> c.platform().equals(platform) && c.month().equals(month))
                        .mapToLong(Cell::grossCents).sum())
                .toList())).toList();

        Totals totals = jdbc.sql("""
                        SELECT coalesce(sum(gross_cents), 0) AS gross_cents, coalesce(sum(creator_share_cents), 0) AS creator_cents,
                               coalesce(sum(gross_cents - creator_share_cents), 0) AS platform_cents
                        FROM revenue_entries WHERE period_month >= ? AND period_month <= ?
                        """)
                .params(labels.get(0), labels.get(labels.size() - 1)).query(Totals.class).single();
        int avgShare = totals.grossCents() == 0 ? 60 : (int) Math.round(totals.creatorCents() * 100.0 / totals.grossCents());
        long views = jdbc.sql("SELECT coalesce(sum(views), 0) FROM videos").query(Long.class).single();
        return new Analytics(labels, series, totals, dashboard.grossForMonth(now.toString()),
                dashboard.grossForMonth(now.minusMonths(1).toString()), views, avgShare);
    }
}
