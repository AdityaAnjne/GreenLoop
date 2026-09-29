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
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.greenloop.service.GeminiService;
import com.greenloop.service.GeminiService.GeminiQualityResponse;

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

    @Autowired
    private GeminiService geminiService;

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
            @RequestParam(value = "latitude", required = false) String latitude,
            @RequestParam(value = "longitude", required = false) String longitude,
            @RequestParam("price") String price,
            @RequestParam("quantity") String quantity,
            @RequestParam("retailerId") String retailerIdParam,
            @RequestHeader("Authorization") String authHeader) {

        try {
            // ---------------------------------------------------------
            // 1. Validate authentication
            // ---------------------------------------------------------
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Missing authorization header"));
            }

            String token = authHeader.substring(7);

            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);

            // ---------------------------------------------------------
            // 2. Only FARMER can create products
            // ---------------------------------------------------------
            if (!"farmer".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Only farmers can add products"));
            }

            User farmer = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // ---------------------------------------------------------
            // 3. Validate image
            // ---------------------------------------------------------
            if (image == null || image.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Product image is required"));
            }

            if (image.getContentType() == null
                    || !image.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Only image files are allowed"));
            }

            // ---------------------------------------------------------
            // 4. Validate retailer
            // ---------------------------------------------------------
            Long retailerId;

            try {
                retailerId = Long.parseLong(retailerIdParam);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Please select a valid retailer"));
            }

            User retailer = userRepository.findById(retailerId)
                    .orElseThrow(() -> new RuntimeException("Selected retailer not found"));

            if (!"retailer".equalsIgnoreCase(retailer.getRole())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Selected user is not a retailer"));
            }

            // ---------------------------------------------------------
            // 5. Validate price and quantity
            // ---------------------------------------------------------
            double productPrice;
            int productQuantity;

            try {
                productPrice = Double.parseDouble(price);
                productQuantity = Integer.parseInt(quantity);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Price and quantity must contain valid numbers"));
            }

            if (productPrice <= 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Price must be greater than 0"));
            }

            if (productQuantity <= 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Quantity must be greater than 0"));
            }

            // ---------------------------------------------------------
            // 6. AUTHORITATIVE AI QUALITY CHECK
            //
            // The frontend does NOT provide the quality score anymore.
            // The backend sends the uploaded image directly to Gemini.
            // ---------------------------------------------------------
            String base64Image = Base64.getEncoder()
                    .encodeToString(image.getBytes());

            GeminiQualityResponse aiResult = geminiService.analyzeImage(
                    cropType,
                    base64Image,
                    image.getContentType());

            // ---------------------------------------------------------
            // 7. AI quality gate
            // ---------------------------------------------------------
            if (!aiResult.consumable()) {
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body(Map.of(
                                "message",
                                "This product did not pass the AI quality check and cannot be listed.",
                                "analysis",
                                aiResult.analysis(),
                                "quality",
                                aiResult.quality(),
                                "rating",
                                aiResult.rating(),
                                "freshnessPercent",
                                aiResult.freshnessPercent()));
            }

            // ---------------------------------------------------------
            // 8. Upload image only AFTER AI validation succeeds
            // ---------------------------------------------------------
            String imageUrl = imageUploadService.uploadImage(image);

            // ---------------------------------------------------------
            // 9. Create product
            // ---------------------------------------------------------
            Product product = new Product();

            product.setCropType(cropType);
            product.setName(cropType);
            product.setSoilType(soilType);
            product.setPesticides(pesticides);
            product.setHarvestDate(harvestDate);

            product.setLatitude(parseNullableDouble(latitude));
            product.setLongitude(parseNullableDouble(longitude));

            // IMPORTANT:
            // These values come from Gemini, NOT from the frontend.
            product.setQualityScore(aiResult.rating());
            product.setQualityAnalysis(aiResult.analysis());
            product.setFreshnessPercent(aiResult.freshnessPercent());
            product.setAiHealthBenefit(aiResult.healthBenefit());
            product.setAiDescription(aiResult.productDescription());
            product.setAiShelfLife(aiResult.shelfLifeEstimate());

            product.setImageUrl(imageUrl);
            product.setFarmerId(farmer.getId());
            product.setPrice(productPrice);
            product.setQuantity(productQuantity);
            product.setRetailerId(retailerId);

            // ---------------------------------------------------------
            // 10. Register farmer-retailer relationship
            // ---------------------------------------------------------
            if (!farmerRetailerRepository.existsByFarmerIdAndRetailerId(
                    farmer.getId(),
                    retailerId)) {

                farmerRetailerRepository.save(
                        new com.greenloop.model.FarmerRetailer(
                                farmer.getId(),
                                retailerId));
            }

            // ---------------------------------------------------------
            // 11. Save product
            // ---------------------------------------------------------
            Product savedProduct = productService.addProduct(product, retailerId);

            System.out.println(
                    "[AUDIT] Product created: farmer="
                            + farmer.getId()
                            + ", retailer="
                            + retailerId
                            + ", cropType="
                            + cropType
                            + ", AI quality="
                            + aiResult.quality());

            return ResponseEntity.ok(Map.of(
                    "message", "Product added successfully",
                    "product", savedProduct,
                    "farmerId", farmer.getId(),
                    "retailerName", retailer.getName(),
                    "aiQuality", aiResult));

        } catch (IllegalStateException e) {

            // Gemini configuration/API/response failure
            System.err.println(
                    "[ProductController] AI quality check failed: "
                            + e.getMessage());

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "message",
                            "AI quality check is currently unavailable. Please try again later."));

        } catch (IOException e) {

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            "Image processing failed: " + e.getMessage()));

        } catch (SecurityException e) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", e.getMessage()));

        } catch (Exception e) {

            System.err.println(
                    "[ProductController] Product creation failed: "
                            + e.getMessage());

            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "message",
                            "Error creating product: " + e.getMessage()));
        }
    }

    /**
     * @param farmerId
     * @param cropType
     * @return
     */
    private Double parseNullableDouble(String value) {
        if (value == null || value.isBlank() || "null".equalsIgnoreCase(value.trim())) {
            return null;
        }
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer parseNullableInt(String value) {
        if (value == null || value.isBlank() || "null".equalsIgnoreCase(value.trim())) {
            return null;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

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