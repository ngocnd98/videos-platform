package com.pulsemedia.hub.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pulsemedia.hub.common.ApiException;
import com.pulsemedia.hub.security.CurrentUser;
import com.pulsemedia.hub.security.JwtService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api")
public class AuthController {

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {
    }

    public record LoginResponse(String token, CurrentUser user) {
    }

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwt;

    public AuthController(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwt) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwt = jwt;
    }

    @PostMapping("/auth/login")
    LoginResponse login(@Valid @RequestBody LoginRequest req) {
        var row = users.findByEmail(req.email())
                .filter(r -> passwordEncoder.matches(req.password(), r.passwordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password."));
        if ("SUSPENDED".equals(row.status())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This account is suspended. Contact an administrator.");
        }
        if ("INVITED".equals(row.status())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This invitation hasn't been accepted yet.");
        }
        return new LoginResponse(jwt.issue(row.user()), row.user());
    }

    @GetMapping("/me")
    CurrentUser me(@AuthenticationPrincipal CurrentUser user) {
        return user;
    }
}
