package com.greenloop.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.greenloop.model.Product;
import com.greenloop.model.User;
import com.greenloop.repository.FarmerRetailerRepository;
import com.greenloop.repository.UserRepository;
import com.greenloop.security.JwtUtil;
import com.greenloop.service.ImageUploadService;
import com.greenloop.service.ProductService;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * SECURITY-CRITICAL: Product Controller
 * 
 * Handles products (vegetables) in the supply chain.
 * 
 * KEY POINTS:
 * - Extracts userId and role from JWT
 * - BACKEND assigns retailer to products (not frontend)
 * - Retailer dashboard only sees products assigned to them
 * - All role checks use JWT (never frontend data)
 */
@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "${app.cors.allowed-origin}")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private ImageUploadService imageUploadService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FarmerRetailerRepository farmerRetailerRepository;

    /**
     * PUBLIC: Get all products
     * Available to everyone
     */
    @GetMapping("/all")
    public ResponseEntity<List<Product>> getAllProducts() {
        return ResponseEntity.ok(productService.getAllProducts());
    }

    /**
     * CUSTOMER: Get all available products (status = AVAILABLE or NULL)
     * Returns all products that are available for customer purchase.
     */
    @GetMapping("/customer/products")
    public ResponseEntity<List<Product>> getAvailableProductsForCustomers() {
        System.out.println("[API] /customer/products endpoint called");
        List<Product> products = productService.getAvailableProducts();
        System.out.println("[API] Customer products response size = " + (products == null ? 0 : products.size()));
        return ResponseEntity.ok(products);
    }

    /**
     * MARKETPLACE: Get ALL products for full marketplace view (testing)
     */
    @GetMapping("/marketplace/products")
    public ResponseEntity<List<Product>> getAllMarketplaceProducts() {
        System.out.println("[API] /marketplace/products endpoint called");
        List<Product> products = productService.getMarketplaceProducts();
        System.out.println("[API] Marketplace products response size = " + (products == null ? 0 : products.size()));
        return ResponseEntity.ok(products);
    }

    /**
     * FARMER: Get products created by specific farmer
     * Farmer can only see their own products
     */
    @GetMapping("/farmer/me")
    public ResponseEntity<?> getMyProducts(@RequestHeader("Authorization") String authHeader) {
        try {
            User farmer = getAuthenticatedFarmer(authHeader);
            return ResponseEntity.ok(productService.getProductsByFarmer(farmer.getId()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        }
    }

    /** Public product lookup used by QR-code links. */
    @GetMapping("/{id}")
    public ResponseEntity<?> getProductById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(productService.getAvailableProductById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Product not found"));
        }
    }

    /**
     * Farmer-only product update. The current farmer is derived from the JWT,
     * never from a client-supplied farmer id.
     */
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateProduct(
            @PathVariable Long id,
            @RequestParam("cropType") String cropType,
            @RequestParam("soilType") String soilType,
            @RequestParam("pesticides") String pesticides,
            @RequestParam("harvestDate") String harvestDate,
            @RequestParam("price") Double price,
            @RequestParam("quantity") Integer quantity,
            @RequestParam(value = "retailerId", required = false) String retailerIdParam,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestHeader("Authorization") String authHeader) {
        try {
            User farmer = getAuthenticatedFarmer(authHeader);

            Long retailerId = null;
            if (retailerIdParam != null && !retailerIdParam.isBlank() && !"undefined".equals(retailerIdParam)) {
                try {
                    retailerId = Long.parseLong(retailerIdParam);
                } catch (NumberFormatException e) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Invalid retailer selected"));
                }
                User retailer = userRepository.findById(retailerId)
                        .orElseThrow(() -> new RuntimeException("Selected retailer not found"));
                if (!"retailer".equalsIgnoreCase(retailer.getRole())) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Selected user is not a retailer"));
                }
                if (!farmerRetailerRepository.existsByFarmerIdAndRetailerId(farmer.getId(), retailerId)) {
                    farmerRetailerRepository.save(new com.greenloop.model.FarmerRetailer(farmer.getId(), retailerId));
                }
            }

            String imageUrl = (image != null && !image.isEmpty())
                    ? imageUploadService.uploadImage(image)
                    : null;
            Product updatedProduct = productService.updateProductForFarmer(
                    id, farmer.getId(), cropType, soilType, pesticides, harvestDate, imageUrl,
                    price, quantity, retailerId);
            return ResponseEntity.ok(updatedProduct);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Image upload failed: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    /** Deletes a product from the database after verifying farmer ownership. */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {
        try {
            User farmer = getAuthenticatedFarmer(authHeader);
            productService.deleteProductForFarmer(id, farmer.getId());
            return ResponseEntity.noContent().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message",
                    "Cannot delete this product because it has existing orders."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * CRITICAL: RETAILER Dashboard - Get products assigned to retailer
     * 
     * This is the key endpoint for retailer dashboard.
     * Extracts retailerId from JWT (not frontend).
     * Returns only products assigned to this retailer.
     */
    @GetMapping("/retailer/inventory")
    public ResponseEntity<?> getRetailerInventory(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Missing or invalid authorization header"));
            }

            String token = authHeader.substring(7);

            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);

            if (!"retailer".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Only retailers can access inventory"));
            }

            Optional<User> userOpt = userRepository.findByEmail(email);
            if (!userOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "User not found"));
            }

            User retailer = userOpt.get();
            Long retailerId = retailer.getId();

            List<Product> products = productService.getProductsByRetailer(retailerId);

            return ResponseEntity.ok(Map.of(
                    "retailerId", retailerId,
                    "retailerName", retailer.getName(),
                    "products", products,
                    "count", products.size()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid or expired token"));
        }
    }

    @PostMapping("/add")
    public ResponseEntity<?> addProduct(
            @RequestParam("image") MultipartFile image,
            @RequestParam("cropType") String cropType,
            @RequestParam("soilType") String soilType,
            @RequestParam("pesticides") String pesticides,
            @RequestParam("harvestDate") String harvestDate,
            @RequestParam("latitude") String latitude,
            @RequestParam("longitude") String longitude,
            @RequestParam("price") String price,
            @RequestParam("quantity") String quantity,
            @RequestParam("retailerId") String retailerIdParam,
            @RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Missing authorization header"));
            }

            Long retailerId;
            try {
                retailerId = Long.parseLong(retailerIdParam);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Please select a retailer before submitting"));
            }

            String email = jwtUtil.extractEmail(authHeader.substring(7));
            User farmer = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            User retailer = userRepository.findById(retailerId)
                    .orElseThrow(() -> new RuntimeException("Selected retailer not found"));
            if (!"retailer".equalsIgnoreCase(retailer.getRole())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Selected user is not a retailer"));
            }
            if (!farmerRetailerRepository.existsByFarmerIdAndRetailerId(farmer.getId(), retailerId)) {
                farmerRetailerRepository.save(new com.greenloop.model.FarmerRetailer(farmer.getId(), retailerId));
            }

            String imageUrl = imageUploadService.uploadImage(image);

            Product product = new Product();
            product.setCropType(cropType);
            product.setName(cropType);
            product.setSoilType(soilType);
            product.setPesticides(pesticides);
            product.setHarvestDate(harvestDate);
            product.setLatitude(Double.parseDouble(latitude));
            product.setLongitude(Double.parseDouble(longitude));
            product.setImageUrl(imageUrl);
            product.setFarmerId(farmer.getId());
            product.setPrice(Double.parseDouble(price));
            product.setQuantity(Integer.parseInt(quantity));
            product.setRetailerId(retailerId);

            Product savedProduct = productService.addProduct(product, retailerId);

            System.out.println("[AUDIT] Product created: farmer=" + farmer.getId() + ", retailer=" + retailerId
                    + ", cropType=" + cropType);

            return ResponseEntity.ok(Map.of(
                    "message", "Product added successfully",
                    "product", savedProduct,
                    "farmerId", farmer.getId(),
                    "retailerName", retailer.getName()));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Image upload failed: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Error creating product: " + e.getMessage()));
        }
    }

    /**
     * @param farmerId
     * @param cropType
     * @return
     */
    private Long determineRetailerForProduct(Long farmerId, String cropType) {

        List<User> retailers = userRepository.findAll();

        for (User user : retailers) {
            if ("retailer".equalsIgnoreCase(user.getRole())) {
                return user.getId();
            }
        }

        return null;
    }

    private User getAuthenticatedFarmer(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing or invalid authorization header");
        }

        String email = jwtUtil.extractEmail(authHeader.substring(7));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!"farmer".equalsIgnoreCase(user.getRole())) {
            throw new SecurityException("Only farmers can modify products");
        }

        return user;
    }
}