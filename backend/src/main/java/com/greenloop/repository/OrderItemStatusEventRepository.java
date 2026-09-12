package com.greenloop.repository;

import com.greenloop.model.OrderItemStatusEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemStatusEventRepository extends JpaRepository<OrderItemStatusEvent, Long> {

    List<OrderItemStatusEvent> findByOrderItemIdOrderByOccurredAtAsc(Long orderItemId);

    @Query("""
        SELECT e FROM OrderItemStatusEvent e
        WHERE e.orderItemId IN :orderItemIds
        ORDER BY e.occurredAt ASC
    """)
    List<OrderItemStatusEvent> findByOrderItemIdIn(@Param("orderItemIds") List<Long> orderItemIds);
}