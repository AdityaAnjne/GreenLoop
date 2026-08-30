package com.greenloop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.greenloop.model.Order;
import com.greenloop.model.OrderStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * PRODUCTION ORDER REPOSITORY
 * 
 * Provides data access for Order entities with role-based queries.
 */
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // CUSTOMER QUERIES

    /**
     * Get all orders for a specific customer
     * @param customerId Customer's user ID
     * @return List of orders created by this customer
     */
    @Query("""
        SELECT o FROM Order o 
        LEFT JOIN FETCH o.customer
        WHERE o.customer.id = :customerId
        ORDER BY o.createdAt DESC
    """)
    List<Order> findByCustomerId(@Param("customerId") Long customerId);

    /**
     * Get orders for customer with specific status
     */
    @Query("""
        SELECT o FROM Order o 
        WHERE o.customer.id = :customerId 
        AND o.status = :status
        ORDER BY o.createdAt DESC
    """)
    List<Order> findByCustomerIdAndStatus(@Param("customerId") Long customerId, 
                                           @Param("status") OrderStatus status);

    /**
     * Get recent orders for customer (pagination helper)
     */
    @Query(value = """
        SELECT o FROM Order o 
        WHERE o.customer.id = :customerId
        ORDER BY o.createdAt DESC
        LIMIT :limit
    """)
    List<Order> findRecentOrdersByCustomerId(@Param("customerId") Long customerId, 
                                              @Param("limit") int limit);

    // RETAILER QUERIES

    /**
     * Get all orders containing products sold by this retailer
     * @param retailerId Retailer's user ID
     * @return List of orders with items from this retailer
     */
    @Query("""
        SELECT DISTINCT o FROM Order o
        LEFT JOIN FETCH o.customer
        JOIN o.items oi
        WHERE oi.retailerId = :retailerId
        ORDER BY o.createdAt DESC
    """)
    List<Order> findOrdersByRetailer(@Param("retailerId") Long retailerId);

    /**
     * Get orders where THIS retailer's own items are still PLACED/CONFIRMED
     * Filters on the ITEM's status (oi.status), not the order's rolled-up
     * status, since other retailers' items in the same order may be at a
     * different stage entirely.
     */
    @Query("""
        SELECT DISTINCT o FROM Order o
        LEFT JOIN FETCH o.customer
        JOIN o.items oi
        WHERE oi.retailerId = :retailerId 
        AND oi.status IN ('PLACED', 'CONFIRMED')
        ORDER BY o.createdAt DESC
    """)
    List<Order> findPendingOrdersByRetailer(@Param("retailerId") Long retailerId);

    /**
     * Get orders where this retailer's own items are at a specific status.
     * Filters on the ITEM's status (oi.status), scoped to this retailer.
     */
    @Query("""
        SELECT DISTINCT o FROM Order o
        LEFT JOIN FETCH o.customer
        JOIN o.items oi
        WHERE oi.retailerId = :retailerId 
        AND oi.status = :status
        ORDER BY o.createdAt DESC
    """)
    List<Order> findOrdersByRetailerAndStatus(@Param("retailerId") Long retailerId,
                                               @Param("status") OrderStatus status);

    // DISTRIBUTOR QUERIES - Role-based visibility

    /**
     * Get all orders containing at least one item assigned to this
     * distributor.
     *
     * @param distributorId Distributor's user ID
     * @return List of orders containing items assigned to this distributor
     */
    @Query("""
        SELECT DISTINCT o FROM Order o
        LEFT JOIN FETCH o.customer
        JOIN o.items oi
        WHERE oi.distributorId = :distributorId
        AND oi.status IN ('CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED')
        ORDER BY o.createdAt DESC
    """)
    List<Order> findOrdersByDistributor(@Param("distributorId") Long distributorId);

    /**
     * Get orders with items ready for shipment (PACKED status only) that
     * are assigned to this distributor.
     *
     * @param distributorId Distributor's user ID
     * @return List of orders with items ready to ship
     */
    @Query("""
        SELECT DISTINCT o FROM Order o
        LEFT JOIN FETCH o.customer
        JOIN o.items oi
        WHERE oi.distributorId = :distributorId
        AND oi.status = 'PACKED'
        ORDER BY o.createdAt ASC
    """)
    List<Order> findReadyToShipOrders(@Param("distributorId") Long distributorId);

    /**
     * Get orders with items already shipped/delivered by this distributor.
     *
     * @param distributorId Distributor's user ID
     * @return List of orders with shipped/delivered items
     */
    @Query("""
        SELECT DISTINCT o FROM Order o
        LEFT JOIN FETCH o.customer
        JOIN o.items oi
        WHERE oi.distributorId = :distributorId
        AND oi.status IN ('SHIPPED', 'DELIVERED')
        ORDER BY o.updatedAt DESC
    """)
    List<Order> findShippedOrdersByDistributor(@Param("distributorId") Long distributorId);

    /**
     * Get all orders that have at least one CONFIRMED item with no
     * distributor assigned yet. Used by warehouse/admin to assign
     * distributors.
     *
     * @return List of orders with confirmed items waiting for packing
     */
    @Query("""
        SELECT DISTINCT o FROM Order o
        JOIN o.items oi
        WHERE oi.status = 'CONFIRMED'
        AND oi.distributorId IS NULL
        ORDER BY o.createdAt ASC
    """)
    List<Order> findOrdersWaitingForPacking();

    /**
     * Get orders with items shipped/delivered by a specific distributor in
     * a date range. Useful for distributor performance analytics.
     */
    @Query("""
        SELECT DISTINCT o FROM Order o
        JOIN o.items oi
        WHERE oi.distributorId = :distributorId
        AND oi.status IN ('SHIPPED', 'DELIVERED')
        AND o.updatedAt >= :startDate
        AND o.updatedAt <= :endDate
        ORDER BY o.updatedAt DESC
    """)
    List<Order> findShippedOrdersByDistributorAndDateRange(
            @Param("distributorId") Long distributorId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    // FARMER QUERIES

    /**
     * Get all orders containing products from this farmer
     * @param farmerId Farmer's user ID
     * @return List of orders with items from this farmer
     */
    @Query("""
        SELECT DISTINCT o FROM Order o
        LEFT JOIN FETCH o.customer
        JOIN o.items oi
        WHERE oi.farmerId = :farmerId
        ORDER BY o.createdAt DESC
    """)
    List<Order> findOrdersByFarmer(@Param("farmerId") Long farmerId);

    // ANALYTICS QUERIES

    /**
     * Count orders by customer
     */
    @Query("SELECT COUNT(o) FROM Order o WHERE o.customer.id = :customerId")
    Long countByCustomerId(@Param("customerId") Long customerId);

    /**
     * Count orders by status
     */
    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status")
    Long countByStatus(@Param("status") OrderStatus status);

    /**
     * Get orders created within date range
     */
    @Query("""
        SELECT o FROM Order o 
        WHERE o.createdAt >= :startDate 
        AND o.createdAt <= :endDate
        ORDER BY o.createdAt DESC
    """)
    List<Order> findByDateRange(@Param("startDate") LocalDateTime startDate, 
                                 @Param("endDate") LocalDateTime endDate);

    /**
     * Find order by ID with eager loading of items
     */
    @Query("""
        SELECT o FROM Order o
        LEFT JOIN FETCH o.items
        LEFT JOIN FETCH o.customer
        WHERE o.id = :orderId
    """)
    Optional<Order> findByIdWithItems(@Param("orderId") Long orderId);
}