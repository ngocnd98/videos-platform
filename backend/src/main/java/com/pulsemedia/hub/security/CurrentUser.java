package com.pulsemedia.hub.security;

/** Authenticated principal, rebuilt from JWT claims on every request. */
public record CurrentUser(long id, String email, String role, String staffRole, String displayName, Long creatorId) {

    public boolean isAdmin() {
        return "ADMIN".equals(role);
    }
}
