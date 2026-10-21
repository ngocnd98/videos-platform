package com.pulsemedia.hub;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class HubApplication {

    public static void main(String[] args) throws IOException {
        // SQLite creates the file but not its parent directory.
        Path dbPath = Path.of(System.getenv().getOrDefault("DB_PATH", "./data/app.db")).toAbsolutePath();
        Files.createDirectories(dbPath.getParent());
        SpringApplication.run(HubApplication.class, args);
    }
}
