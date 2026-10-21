package com.pulsemedia.hub.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app")
public record AppProperties(Jwt jwt, R2 r2) {

    public record Jwt(String secret, Duration ttl) {
    }

    public record R2(String endpoint, String accessKey, String secretKey, String bucket,
                     Duration presignTtl, String uploadPrefix, String seedPrefix) {

        public boolean configured() {
            return notBlank(endpoint) && notBlank(accessKey) && notBlank(secretKey) && notBlank(bucket);
        }

        private static boolean notBlank(String s) {
            return s != null && !s.isBlank();
        }
    }
}
