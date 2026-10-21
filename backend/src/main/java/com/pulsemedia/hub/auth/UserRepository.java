package com.pulsemedia.hub.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.pulsemedia.hub.security.CurrentUser;

@Repository
public class UserRepository {

    public record UserRow(CurrentUser user, String passwordHash, String status) {
    }

    private static final String SELECT = """
            SELECT u.id, u.email, u.password_hash, u.status, u.role, u.staff_role, u.display_name, cp.id AS creator_id
            FROM users u
            LEFT JOIN creator_profiles cp ON cp.user_id = u.id
            """;

    private final JdbcClient jdbc;

    public UserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<UserRow> findByEmail(String email) {
        return jdbc.sql(SELECT + " WHERE lower(u.email) = lower(:email)")
                .param("email", email)
                .query((rs, i) -> new UserRow(
                        new CurrentUser(
                                rs.getLong("id"),
                                rs.getString("email"),
                                rs.getString("role"),
                                rs.getString("staff_role"),
                                rs.getString("display_name"),
                                nullableLong(rs, "creator_id")),
                        rs.getString("password_hash"),
                        rs.getString("status")))
                .optional();
    }

    private static Long nullableLong(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }
}
