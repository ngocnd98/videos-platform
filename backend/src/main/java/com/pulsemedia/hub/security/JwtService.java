package com.pulsemedia.hub.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import com.pulsemedia.hub.config.AppProperties;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    private final SecretKey key;
    private final AppProperties.Jwt config;

    public JwtService(AppProperties props) {
        this.config = props.jwt();
        this.key = Keys.hmacShaKeyFor(config.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String issue(CurrentUser user) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .subject(Long.toString(user.id()))
                .claim("email", user.email())
                .claim("role", user.role())
                .claim("name", user.displayName())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(config.ttl())));
        if (user.staffRole() != null) {
            builder.claim("staffRole", user.staffRole());
        }
        if (user.creatorId() != null) {
            builder.claim("creatorId", user.creatorId());
        }
        return builder.signWith(key).compact();
    }

    /** Returns the user encoded in the token, or null if it is invalid or expired. */
    public CurrentUser parse(String token) {
        try {
            Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            Number creatorId = c.get("creatorId", Number.class);
            return new CurrentUser(
                    Long.parseLong(c.getSubject()),
                    c.get("email", String.class),
                    c.get("role", String.class),
                    c.get("staffRole", String.class),
                    c.get("name", String.class),
                    creatorId == null ? null : creatorId.longValue());
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
