package com.greenloop.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.greenloop.model.PasswordResetToken;
import com.greenloop.model.User;
import com.greenloop.repository.PasswordResetTokenRepository;
import com.greenloop.repository.UserRepository;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "${app.cors.allowed-origin}")
public class AuthController {

    @org.springframework.beans.factory.annotation.Value("${app.cors.allowed-origin}")
    private String frontendUrl;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        String link = null;
        if (userOpt.isPresent()) {
            User user = userOpt.get();

            String token = UUID.randomUUID().toString();
            Instant expiry = Instant.now().plus(60, ChronoUnit.MINUTES);

            PasswordResetToken prt = new PasswordResetToken(token, user, expiry);
            tokenRepository.save(prt);

            String encoded = URLEncoder.encode(token, StandardCharsets.UTF_8);
            link = frontendUrl + "/reset-password?token=" + encoded;
            System.out.println("[Password Reset] Send link to " + email + ": " + link);
        }

        return ResponseEntity.ok(link == null
            ? Map.of("message", "If this email is registered, a reset link has been sent.")
            : Map.of(
                "message", "If this email is registered, a reset link has been sent.",
                "resetLink", link
            )
        );
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("password");

        if (token == null || token.isBlank() || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid request"));
        }

        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByToken(token);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid or expired token"));
        }

        PasswordResetToken prt = tokenOpt.get();
        if (prt.getExpiresAt().isBefore(Instant.now())) {
            tokenRepository.deleteByToken(token);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid or expired token"));
        }

        User user = prt.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        tokenRepository.deleteByToken(token);

        return ResponseEntity.ok(Map.of("message", "Password updated"));
    }
}