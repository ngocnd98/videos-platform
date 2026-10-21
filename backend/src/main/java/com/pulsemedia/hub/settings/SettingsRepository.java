package com.pulsemedia.hub.settings;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.pulsemedia.hub.settings.SettingsDtos.PlatformSetting;
import com.pulsemedia.hub.settings.SettingsDtos.StorageUsage;

@Repository
public class SettingsRepository {

    private final JdbcClient jdbc;

    public SettingsRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Map<String, String> values() {
        return jdbc.sql("SELECT key, value FROM settings").query((rs, i) -> Map.entry(rs.getString(1), rs.getString(2)))
                .list().stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    public void put(String key, String value) {
        jdbc.sql("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value")
                .params(key, value).update();
    }

    public List<PlatformSetting> platforms() {
        return jdbc.sql("SELECT name, enabled FROM platforms ORDER BY id").query(PlatformSetting.class).list();
    }

    public void setEnabledPlatforms(List<String> names) {
        jdbc.sql("UPDATE platforms SET enabled = CASE WHEN name IN (:names) THEN 1 ELSE 0 END")
                .param("names", names).update();
    }

    public StorageUsage storage() {
        return jdbc.sql("""
                        SELECT count(*) AS original_files, coalesce(sum(size_bytes), 0) AS used_bytes
                        FROM video_files WHERE kind = 'ORIGINAL' AND status = 'AVAILABLE'
                        """)
                .query(StorageUsage.class).single();
    }
}
