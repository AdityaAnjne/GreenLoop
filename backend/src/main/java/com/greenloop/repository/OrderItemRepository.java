package com.greenloop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.greenloop.model.OrderItem;

import java.util.List;

/**
 * ORDER ITEM REPOSITORY
 * 
 * Provides data access for OrderItem entities.
 */
@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    /**
     * Get all items for a specific order
     */
    @Query("SELECT oi FROM OrderItem oi WHERE oi.order.id = :orderId")
    List<OrderItem> findByOrderId(@Param("orderId") Long orderId);

    /**
     * Get all items sold by a retailer
     */
    @Query("SELECT oi FROM OrderItem oi WHERE oi.retailerId = :retailerId")
    List<OrderItem> findByRetailerId(@Param("retailerId") Long retailerId);

    /**
     * Get all items from a farmer
     */
    @Query("SELECT oi FROM OrderItem oi WHERE oi.farmerId = :farmerId")
    List<OrderItem> findByFarmerId(@Param("farmerId") Long farmerId);

    /**
     * Get items by product ID
     */
    @Query("SELECT oi FROM OrderItem oi WHERE oi.product.id = :productId")
    List<OrderItem> findByProductId(@Param("productId") Long productId);

    /**
     * Get only the items within one order that belong to a specific retailer.
     */
    @Query("SELECT oi FROM OrderItem oi WHERE oi.order.id = :orderId AND oi.retailerId = :retailerId")
    List<OrderItem> findByOrderIdAndRetailerId(@Param("orderId") Long orderId, @Param("retailerId") Long retailerId);

    /**
     * Get only the items within one order assigned to a specific
     * distributor (assigned by the owning retailer at confirm time).
     */
    @Query("SELECT oi FROM OrderItem oi WHERE oi.order.id = :orderId AND oi.distributorId = :distributorId")
    List<OrderItem> findByOrderIdAndDistributorId(@Param("orderId") Long orderId,
            @Param("distributorId") Long distributorId);
}
