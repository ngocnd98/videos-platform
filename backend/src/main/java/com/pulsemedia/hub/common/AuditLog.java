package com.pulsemedia.hub.common;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Append-only history shown in the admin "Review audit log" drawer. */
@Component
public class AuditLog {

    private final JdbcClient jdbc;

    public AuditLog(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void record(String entity, String entityId, String title, String action, String detail, long actorId) {
        jdbc.sql("INSERT INTO audit_logs (entity, entity_id, title, action, detail, actor_id) VALUES (?, ?, ?, ?, ?, ?)")
                .params(entity, entityId, title, action, detail, actorId)
                .update();
    }
}
