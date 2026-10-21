package com.pulsemedia.hub.dashboard;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pulsemedia.hub.dashboard.DashboardDtos.AdminDashboard;
import com.pulsemedia.hub.dashboard.DashboardDtos.CreatorDashboard;
import com.pulsemedia.hub.dashboard.DashboardDtos.MonthlyGross;
import com.pulsemedia.hub.security.CurrentUser;
import com.pulsemedia.hub.settings.SettingsService;

@RestController
@RequestMapping("/api")
public class DashboardController {

    private static final int CHART_MONTHS = 6;

    private final DashboardRepository repo;
    // SQLite's 'now' is UTC, so month boundaries are computed in UTC as well.
    private final Clock clock = Clock.systemUTC();

    private final SettingsService settings;

    public DashboardController(DashboardRepository repo, SettingsService settings) {
        this.repo = repo;
        this.settings = settings;
    }

    @GetMapping("/admin/dashboard")
    AdminDashboard admin() {
        YearMonth now = YearMonth.now(clock);
        return new AdminDashboard(
                repo.pendingReview(),
                repo.submittedToday(),
                repo.publishedBetweenDaysAgo(7, 0),
                repo.publishedBetweenDaysAgo(14, 7),
                repo.platformCount(),
                repo.grossForMonth(now.toString()),
                repo.grossForMonth(now.minusMonths(1).toString()),
                repo.activeCreators(),
                repo.creatorsJoinedThisMonth(),
                repo.reviewQueue(3),
                lastMonths(now),
                repo.recentPublications(5),
                repo.approvedUnpublished(),
                repo.pendingPayouts(),
                repo.pendingPayoutsCents(),
                repo.storageUsedBytes(),
                settings.get().storageQuotaGb());
    }

    @GetMapping("/creator/dashboard")
    CreatorDashboard creator(@AuthenticationPrincipal CurrentUser user) {
        long creatorId = user.creatorId();
        LocalDate nextPayout = LocalDate.now(clock).withDayOfMonth(1).plusMonths(1);
        return new CreatorDashboard(
                repo.totalViews(creatorId),
                repo.publishedCount(creatorId),
                repo.totalEarnedCents(creatorId),
                repo.pendingPayoutCents(creatorId),
                nextPayout,
                repo.latestVideos(creatorId, 6),
                repo.profile(creatorId));
    }

    /** Gross per month for the chart, including months with no revenue. */
    private List<MonthlyGross> lastMonths(YearMonth now) {
        YearMonth from = now.minusMonths(CHART_MONTHS - 1);
        Map<String, Long> byMonth = repo.grossByMonthSince(from.toString()).stream()
                .collect(Collectors.toMap(MonthlyGross::month, MonthlyGross::grossCents));
        List<MonthlyGross> result = new ArrayList<>(CHART_MONTHS);
        for (YearMonth m = from; !m.isAfter(now); m = m.plusMonths(1)) {
            result.add(new MonthlyGross(m.toString(), byMonth.getOrDefault(m.toString(), 0L)));
        }
        return result;
    }
}
