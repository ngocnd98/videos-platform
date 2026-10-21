package com.pulsemedia.hub.common;

import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pulsemedia.hub.config.AppProperties;

@RestController
public class HealthController {

    private final JdbcClient jdbc;
    private final AppProperties props;

    public HealthController(JdbcClient jdbc, AppProperties props) {
        this.jdbc = jdbc;
        this.props = props;
    }

    @GetMapping("/api/health")
    Map<String, Object> health() {
        Integer one = jdbc.sql("SELECT 1").query(Integer.class).single();
        return Map.of("status", "UP", "db", one == 1 ? "UP" : "DOWN", "storage", props.r2().configured() ? "R2" : "NOT_CONFIGURED");
    }
}
