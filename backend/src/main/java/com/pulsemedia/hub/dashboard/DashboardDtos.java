package com.pulsemedia.hub.dashboard;

import java.time.LocalDate;
import java.util.List;

public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record AdminDashboard(
            int pendingReview,
            int submittedToday,
            int publishedLast7Days,
            int publishedPrev7Days,
            int platformCount,
            long grossThisMonthCents,
            long grossLastMonthCents,
            int activeCreators,
            int creatorsJoinedThisMonth,
            List<ReviewItem> reviewQueue,
            List<MonthlyGross> revenueByMonth,
            List<PublicationItem> recentPublications) {
    }

    public record ReviewItem(String code, String title, String creator, String category, String thumbColor,
                             Integer durationSec, String submittedAt) {
    }

    public record MonthlyGross(String month, long grossCents) {
    }

    public record PublicationItem(String code, String title, String creator, String platform, String url,
                                  String thumbColor, String publishedAt) {
    }

    public record CreatorDashboard(
            long totalViews,
            int publishedCount,
            long totalEarnedCents,
            long pendingPayoutCents,
            LocalDate nextPayoutDate,
            List<CreatorVideo> videos,
            CreatorProfile profile) {
    }

    public record CreatorVideo(String code, String title, String category, String status, long views,
                               String thumbColor, String createdAt) {
    }

    public record CreatorProfile(String displayName, String creatorCode, String slug, String country,
                                 String payoutMethod, double splitPct, String contractSignedAt) {
    }
}
