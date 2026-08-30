package com.greenloop.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String jwtSecret; // must be >=32 chars, set in application.properties
    private static final long EXPIRATION_TIME = 1000 * 60 * 60 * 10; // 10 hours
    private static final String ROLE_CLAIM = "role";

    private Key key;

    private Key getKey() {
        if (key == null) {
            key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        }
        return key;
    }

    // SECURITY: Generate token with role from DATABASE (not frontend)
    public String generateToken(String email, String role) {
        return Jwts.builder()
                .setSubject(email)
                .claim(ROLE_CLAIM, role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(getKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Long extractFarmerId(String token) {
        Claims claims = extractClaims(token);
        Object idObj = claims.get("farmerId"); // assuming you store farmerId in JWT claims
        if (idObj instanceof Integer) {
            return ((Integer) idObj).longValue();
        } else if (idObj instanceof Long) {
            return (Long) idObj;
        } else {
            throw new IllegalArgumentException("Invalid farmerId in token");
        }
    }


    // Extract email (subject) from token
    public String extractEmail(String token) {
        return extractClaims(token).getSubject();
    }

    // SECURITY: Extract role from token (authority source of truth)
    public String extractRole(String token) {
        return extractClaims(token).get(ROLE_CLAIM, String.class);
    }

    // Validate token with email
    public boolean validateToken(String token, String email) {
        try {
            return (email.equals(extractEmail(token)) && !isTokenExpired(token));
        } catch (JwtException | IllegalArgumentException e) {
            return false; // invalid token
        }
    }

    private boolean isTokenExpired(String token) {
        return extractClaims(token).getExpiration().before(new Date());
    }

    private Claims extractClaims(String token) {
        try {
            return Jwts.parserBuilder()
                       .setSigningKey(getKey())
                       .build()
                       .parseClaimsJws(token)
                       .getBody();
        } catch (JwtException e) {
            throw new IllegalArgumentException("Invalid JWT token", e);
        }
    }
}