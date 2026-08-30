package com.greenloop.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.greenloop.dto.PublicUserDto;
import com.greenloop.model.*;
import com.greenloop.repository.*;
import com.greenloop.security.JwtUtil;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/network")
@CrossOrigin(origins = "${app.cors.allowed-origin}")
public class NetworkController {

    @Autowired private UserRepository userRepository;
    @Autowired private FarmerRetailerRepository farmerRetailerRepository;
    @Autowired private RetailerDistributorRepository retailerDistributorRepository;
    @Autowired private JwtUtil jwtUtil;

    private User authenticate(String authHeader, String requiredRole) throws Exception {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new SecurityException("Missing or invalid authorization header");
        }
        String token = authHeader.substring(7);
        String email = jwtUtil.extractEmail(token);
        String role = jwtUtil.extractRole(token);
        if (!requiredRole.equalsIgnoreCase(role)) {
            throw new SecurityException("Only " + requiredRole + "s can access this endpoint");
        }
        return userRepository.findByEmail(email).orElseThrow(() -> new Exception("User not found"));
    }

    //  FARMER → RETAILER 

    @GetMapping("/retailers")
    public ResponseEntity<?> getMyRetailers(@RequestHeader("Authorization") String authHeader) {
        try {
            User farmer = authenticate(authHeader, "farmer");
            List<Long> ids = farmerRetailerRepository.findByFarmerId(farmer.getId())
                    .stream().map(FarmerRetailer::getRetailerId).collect(Collectors.toList());
            List<PublicUserDto> retailers = userRepository.findAllById(ids)
                    .stream().map(PublicUserDto::from).collect(Collectors.toList());
            return ResponseEntity.ok(retailers);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid token"));
        }
    }

    @GetMapping("/retailers/available")
    public ResponseEntity<?> getAvailableRetailers(@RequestHeader("Authorization") String authHeader) {
        try {
            authenticate(authHeader, "farmer");
            List<PublicUserDto> retailers = userRepository.findAll().stream()
                    .filter(u -> "retailer".equalsIgnoreCase(u.getRole()))
                    .map(PublicUserDto::from)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(retailers);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid token"));
        }
    }

    @PostMapping("/retailers")
    public ResponseEntity<?> addRetailer(@RequestHeader("Authorization") String authHeader,
                                          @RequestBody Map<String, Long> body) {
        try {
            User farmer = authenticate(authHeader, "farmer");
            Long retailerId = body.get("retailerId");
            if (retailerId == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "retailerId is required"));
            }
            User retailer = userRepository.findById(retailerId)
                    .orElseThrow(() -> new IllegalArgumentException("Retailer not found"));
            if (!"retailer".equalsIgnoreCase(retailer.getRole())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Target user is not a retailer"));
            }
            if (farmerRetailerRepository.existsByFarmerIdAndRetailerId(farmer.getId(), retailerId)) {
                return ResponseEntity.ok(Map.of("message", "Already in your network"));
            }
            farmerRetailerRepository.save(new FarmerRetailer(farmer.getId(), retailerId));
            return ResponseEntity.ok(Map.of("message", "Retailer added to your network"));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid token"));
        }
    }

    //  RETAILER → DISTRIBUTOR 

    @GetMapping("/distributors")
    public ResponseEntity<?> getMyDistributors(@RequestHeader("Authorization") String authHeader) {
        try {
            User retailer = authenticate(authHeader, "retailer");
            List<Long> ids = retailerDistributorRepository.findByRetailerId(retailer.getId())
                    .stream().map(RetailerDistributor::getDistributorId).collect(Collectors.toList());
            List<PublicUserDto> distributors = userRepository.findAllById(ids)
                    .stream().map(PublicUserDto::from).collect(Collectors.toList());
            return ResponseEntity.ok(distributors);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid token"));
        }
    }

    @GetMapping("/distributors/available")
    public ResponseEntity<?> getAvailableDistributors(@RequestHeader("Authorization") String authHeader) {
        try {
            authenticate(authHeader, "retailer");
            List<PublicUserDto> distributors = userRepository.findAll().stream()
                    .filter(u -> "distributor".equalsIgnoreCase(u.getRole()))
                    .map(PublicUserDto::from)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(distributors);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid token"));
        }
    }

    @PostMapping("/distributors")
    public ResponseEntity<?> addDistributor(@RequestHeader("Authorization") String authHeader,
                                             @RequestBody Map<String, Long> body) {
        try {
            User retailer = authenticate(authHeader, "retailer");
            Long distributorId = body.get("distributorId");
            if (distributorId == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "distributorId is required"));
            }
            User distributor = userRepository.findById(distributorId)
                    .orElseThrow(() -> new IllegalArgumentException("Distributor not found"));
            if (!"distributor".equalsIgnoreCase(distributor.getRole())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Target user is not a distributor"));
            }
            if (retailerDistributorRepository.existsByRetailerIdAndDistributorId(retailer.getId(), distributorId)) {
                return ResponseEntity.ok(Map.of("message", "Already in your network"));
            }
            retailerDistributorRepository.save(new RetailerDistributor(retailer.getId(), distributorId));
            return ResponseEntity.ok(Map.of("message", "Distributor added to your network"));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid token"));
        }
    }
}