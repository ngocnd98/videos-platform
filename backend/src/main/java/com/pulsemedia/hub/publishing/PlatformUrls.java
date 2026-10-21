package com.pulsemedia.hub.publishing;

import java.net.URI;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Same rules as the prototype's validPlatformUrl, enforced on the server too. */
final class PlatformUrls {

    private static final Pattern TIKTOK_PATH = Pattern.compile("^/@[^/]+/video/\\d+.*");
    private static final Pattern INSTAGRAM_PATH = Pattern.compile("^/reel/[^/]+.*");

    private PlatformUrls() {
    }

    static boolean isValid(String platform, String value) {
        URI uri;
        try {
            uri = URI.create(value.trim());
        } catch (IllegalArgumentException e) {
            return false;
        }
        String scheme = uri.getScheme();
        if (uri.getHost() == null || !("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))) {
            return false;
        }
        String host = uri.getHost().toLowerCase(Locale.ROOT).replaceFirst("^www\\.", "");
        String path = uri.getPath() == null ? "" : uri.getPath();
        return switch (platform) {
            case "YouTube" -> host.equals("youtu.be")
                    ? path.length() > 1
                    : Set.of("youtube.com", "m.youtube.com").contains(host)
                            && ((path.startsWith("/watch") && uri.getQuery() != null && uri.getQuery().contains("v="))
                                || path.startsWith("/shorts/"));
            case "TikTok" -> host.equals("tiktok.com") && TIKTOK_PATH.matcher(path).matches();
            case "Instagram" -> host.equals("instagram.com") && INSTAGRAM_PATH.matcher(path).matches();
            default -> false;
        };
    }
}
