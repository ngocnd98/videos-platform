package com.pulsemedia.hub.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.pulsemedia.hub.config.AppProperties;

@Configuration
public class StorageConfig {

    private static final Logger log = LoggerFactory.getLogger(StorageConfig.class);

    @Bean
    ObjectStorage objectStorage(AppProperties props) {
        if (!props.r2().configured()) {
            log.warn("R2 is not configured (R2_ENDPOINT/R2_BUCKET/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY); uploads are disabled.");
            return new UnconfiguredStorage();
        }
        log.info("Using R2 bucket '{}'", props.r2().bucket());
        return new R2ObjectStorage(props.r2());
    }
}
