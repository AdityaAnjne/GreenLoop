package com.greenloop.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.greenloop.model.*;
import com.greenloop.repository.UserRepository;
import com.greenloop.security.JwtUtil;
import com.greenloop.service.OrderService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ENDPOINTS:
 * - POST /api/orders (Checkout)
 * - GET /api/orders/customer (Customer's orders)
 * - GET /api/orders/retailer (Retailer's orders)
 * - GET /api/orders/farmer (Farmer's orders)
 * - GET /api/orders/{id} (Order details)
 * - PUT /api/orders/{id}/confirm (Confirm order)
 * - PUT /api/orders/{id}/ship (Ship order)
 * - PUT /api/orders/{id}/deliver (Deliver order)
 * - PUT /api/orders/{id}/cancel (Cancel order)
 */
@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "${app.cors.allowed-origin}")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    public ResponseEntity<?> checkout(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CheckoutRequest request) {

        try {
            System.out.println("[OrderController] Checkout request received");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("Missing or invalid Authorization header"));
            }

            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);

            if (!"customer".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only customers can place orders. Your role: " + role));
            }

            Optional<User> customerOpt = userRepository.findByEmail(email);
            if (!customerOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("User account not found"));
            }

            User customer = customerOpt.get();
            System.out.println("[OrderController] Customer: " + customer.getId() + " (" + email + ")");

            if (request.items == null || request.items.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Cart cannot be empty"));
            }

            if (request.items.size() > 100) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Cart too large (max 100 items)"));
            }

            System.out.println("[OrderController] Processing " + request.items.size() + " items");

          List<OrderService.CheckoutItem> serviceItems = request.items.stream()
        .map(i -> new OrderService.CheckoutItem(i.productId, i.quantity))
        .collect(Collectors.toList());

Order order = orderService.createOrderFromCheckout(
        customer,
        serviceItems
);


            System.out.println("[OrderController] Order created: " + order.getId());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new OrderResponse(order));

        } catch (IllegalArgumentException e) {
            System.err.println("[OrderController] Validation error: " + e.getMessage());
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage()));

        } catch (Exception e) {
            System.err.println("[OrderController] Checkout error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Checkout failed: " + e.getMessage()));
        }
    }

    @GetMapping("/customer")
    public ResponseEntity<?> getCustomerOrders(
            @RequestHeader("Authorization") String authHeader) {

        try {
            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);

            if (!"customer".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only customers can access this endpoint"));
            }

            User customer = userRepository.findByEmail(email)
                    .orElseThrow(() -> new Exception("User not found"));

            List<Order> orders = orderService.getCustomerOrders(customer.getId());

            List<OrderResponse> response = orders.stream()
                    .map(OrderResponse::new)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Invalid token: " + e.getMessage()));
        }
    }

    @GetMapping("/retailer")
    public ResponseEntity<?> getRetailerOrders(
            @RequestHeader("Authorization") String authHeader) {

        try {
            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);

            if (!"retailer".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only retailers can access this endpoint"));
            }

            User retailer = userRepository.findByEmail(email)
                    .orElseThrow(() -> new Exception("User not found"));

            List<Order> orders = orderService.getRetailerOrders(retailer.getId());

            List<OrderResponse> response = orders.stream()
                    .map(o -> new OrderResponse(o, retailer.getId(), null))
                    .collect(Collectors.toList());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Invalid token: " + e.getMessage()));
        }
    }

    @GetMapping("/distributor")
    public ResponseEntity<?> getDistributorOrders(
            @RequestHeader("Authorization") String authHeader) {

        try {
            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);

            if (!"distributor".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only distributors can access this endpoint"));
            }

            User distributor = userRepository.findByEmail(email)
                    .orElseThrow(() -> new Exception("User not found"));

            List<Order> orders = orderService.getDistributorOrders(distributor.getId());

            List<OrderResponse> response = orders.stream()
                    .map(o -> new OrderResponse(o, null, distributor.getId()))
                    .collect(Collectors.toList());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Invalid token: " + e.getMessage()));
        }
    }

    @GetMapping("/farmer")
    public ResponseEntity<?> getFarmerOrders(
            @RequestHeader("Authorization") String authHeader) {

        try {
            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);

            if (!"farmer".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only farmers can access this endpoint"));
            }

            User farmer = userRepository.findByEmail(email)
                    .orElseThrow(() -> new Exception("User not found"));

            List<Order> orders = orderService.getFarmerOrders(farmer.getId());

            List<OrderResponse> response = orders.stream()
                    .map(o -> new OrderResponse(o, null, null, farmer.getId()))
                    .collect(Collectors.toList());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Invalid token"));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrder(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {

        try {
            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);

            Order order = orderService.getOrder(id);

            boolean allowed;
            switch (role == null ? "" : role.toLowerCase()) {
                case "admin":
                    allowed = true;
                    break;
                case "customer": {
                    User customer = userRepository.findByEmail(email).orElse(null);
                    allowed = customer != null
                            && order.getCustomer() != null
                            && customer.getId().equals(order.getCustomer().getId());
                    break;
                }
                case "retailer": {
                    User retailer = userRepository.findByEmail(email).orElse(null);
                    allowed = retailer != null && order.getItems().stream()
                            .anyMatch(item -> retailer.getId().equals(item.getRetailerId()));
                    break;
                }
                case "distributor": {
                    User distributor = userRepository.findByEmail(email).orElse(null);
                    allowed = distributor != null && order.getItems().stream()
                            .anyMatch(item -> distributor.getId().equals(item.getDistributorId()));
                    break;
                }
                default:
                    allowed = false;
            }

            if (!allowed) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("Order not found"));
            }

            String lowerRole = role == null ? "" : role.toLowerCase();
            OrderResponse body;
            if ("retailer".equals(lowerRole)) {
                User retailer = userRepository.findByEmail(email).orElse(null);
                body = new OrderResponse(order, retailer != null ? retailer.getId() : null, null);
            } else if ("distributor".equals(lowerRole)) {
                User distributor = userRepository.findByEmail(email).orElse(null);
                body = new OrderResponse(order, null, distributor != null ? distributor.getId() : null);
            } else {
                body = new OrderResponse(order);
            }

            return ResponseEntity.ok(body);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse("Order not found"));
        }
    }

    @PutMapping("/{id}/confirm")
    public ResponseEntity<?> confirmOrder(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body,
            @RequestHeader("Authorization") String authHeader) {

        try {
            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);

            if (!"retailer".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only retailers can confirm orders"));
            }

            User retailer = userRepository.findByEmail(email)
                    .orElseThrow(() -> new Exception("User not found"));

            Long distributorId = body != null ? body.get("distributorId") : null;
            if (distributorId == null) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("distributorId is required"));
            }

            Order order = orderService.confirmOrder(id, retailer.getId(), distributorId);
            return ResponseEntity.ok(new OrderResponse(order, retailer.getId(), null));

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to confirm order: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/pack")
    public ResponseEntity<?> packOrder(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {

        try {
            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);

            if (!"distributor".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only distributors can pack orders"));
            }

            User distributor = userRepository.findByEmail(email)
                    .orElseThrow(() -> new Exception("User not found"));

            Order order = orderService.packOrder(id, distributor.getId());
            return ResponseEntity.ok(new OrderResponse(order, null, distributor.getId()));

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse(e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to pack order: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/ship")
    public ResponseEntity<?> shipOrder(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {

        try {
            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);

            if (!"distributor".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only distributors can ship orders"));
            }

            User distributor = userRepository.findByEmail(email)
                    .orElseThrow(() -> new Exception("User not found"));

            Order order = orderService.shipOrder(id, distributor.getId());
            return ResponseEntity.ok(new OrderResponse(order, null, distributor.getId()));

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to ship order: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/deliver")
    public ResponseEntity<?> deliverOrder(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {

        try {
            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);

            if (!"distributor".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only distributors can deliver orders"));
            }

            User distributor = userRepository.findByEmail(email)
                    .orElseThrow(() -> new Exception("User not found"));

            Order order = orderService.deliverOrder(id, distributor.getId());
            return ResponseEntity.ok(new OrderResponse(order, null, distributor.getId()));

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to deliver order: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelOrder(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {

        try {
            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);

            if ("customer".equalsIgnoreCase(role)) {
                User customer = userRepository.findByEmail(email)
                        .orElseThrow(() -> new Exception("User not found"));

                Order order = orderService.getOrder(id);
                if (!order.getCustomer().getId().equals(customer.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(new ErrorResponse("Cannot cancel someone else's order"));
                }
            }

            Order order = orderService.cancelOrder(id);
            return ResponseEntity.ok(new OrderResponse(order));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to cancel order: " + e.getMessage()));
        }
    }

    public static class CheckoutRequest {
        public List<CheckoutItemRequest> items;

        public CheckoutRequest() {}

        public CheckoutRequest(List<CheckoutItemRequest> items) {
            this.items = items;
        }
    }

    public static class CheckoutItemRequest {
        public Long productId;
        public Integer quantity;

        public CheckoutItemRequest() {}

        public CheckoutItemRequest(Long productId, Integer quantity) {
            this.productId = productId;
            this.quantity = quantity;
        }
    }

    public static class OrderResponse {
        public Long id;
        public Long customerId;
        public String customerName;
        public BigDecimal totalAmount;
        public String status;
        public LocalDateTime createdAt;
        public LocalDateTime updatedAt;
        public List<OrderItemResponse> items;

        public OrderResponse() {}

        public OrderResponse(Order order) {
            this(order, null, null, null);
        }

        public OrderResponse(Order order, Long viewerRetailerId, Long viewerDistributorId) {
            this(order, viewerRetailerId, viewerDistributorId, null);
        }

        public OrderResponse(Order order, Long viewerRetailerId, Long viewerDistributorId, Long viewerFarmerId) {
            this.id = order.getId();
            this.customerId = order.getCustomer() != null ? order.getCustomer().getId() : null;
            this.customerName = order.getCustomer() != null ? order.getCustomer().getName() : null;
            this.createdAt = order.getCreatedAt();
            this.updatedAt = order.getUpdatedAt();

            List<OrderItem> allItems = order.getItems();
            List<OrderItem> visible;
            boolean scoped = viewerRetailerId != null || viewerDistributorId != null || viewerFarmerId != null;

            if (viewerRetailerId != null) {
                visible = allItems.stream()
                        .filter(i -> viewerRetailerId.equals(i.getRetailerId()))
                        .collect(Collectors.toList());
            } else if (viewerDistributorId != null) {
                visible = allItems.stream()
                        .filter(i -> viewerDistributorId.equals(i.getDistributorId()))
                        .collect(Collectors.toList());
            } else if (viewerFarmerId != null) {
                visible = allItems.stream()
                        .filter(i -> viewerFarmerId.equals(i.getFarmerId()))
                        .collect(Collectors.toList());
            } else {
                visible = allItems;
            }

            this.items = visible.stream()
                    .map(OrderItemResponse::new)
                    .collect(Collectors.toList());

            if (scoped) {
                this.totalAmount = visible.stream()
                        .map(OrderItem::getLineTotal)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                this.status = visible.stream()
                        .findFirst()
                        .map(i -> i.getStatus().toString())
                        .orElse(order.getStatus().toString());
            } else {
                this.totalAmount = order.getTotalAmount();
                this.status = order.getStatus().toString();
            }
        }
    }

    public static class OrderItemResponse {
        public Long id;
        public Long productId;
        public String productName;
        public Integer quantity;
        public BigDecimal priceAtPurchase;
        public Long farmerId;
        public Long retailerId;
        public BigDecimal lineTotal;
        public String status;
        public Long distributorId;

        public OrderItemResponse() {}

        public OrderItemResponse(OrderItem item) {
            this.id = item.getId();
            this.productId = item.getProduct() != null ? item.getProduct().getId() : null;
            this.productName = item.getProduct() != null ? item.getProduct().getCropType() : null;
            this.quantity = item.getQuantity();
            this.priceAtPurchase = item.getPriceAtPurchase();
            this.farmerId = item.getFarmerId();
            this.retailerId = item.getRetailerId();
            this.lineTotal = item.getLineTotal();
            this.status = item.getStatus() != null ? item.getStatus().toString() : null;
            this.distributorId = item.getDistributorId();
        }
    }

    public static class ErrorResponse {
        public String message;
        public LocalDateTime timestamp;

        public ErrorResponse(String message) {
            this.message = message;
            this.timestamp = LocalDateTime.now();
        }
    }
}