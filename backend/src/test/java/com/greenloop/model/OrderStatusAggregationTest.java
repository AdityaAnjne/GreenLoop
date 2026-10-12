package com.greenloop.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.List;
import org.junit.jupiter.api.Test;

class OrderStatusAggregationTest {
    @Test
    void harvestedFreshItemKeepsMixedOrderAtHarvestedUntilPacking() {
        Order order = orderWith(OrderStatus.HARVESTED, OrderStatus.PACKED);

        order.recomputeStatus();

        assertEquals(OrderStatus.HARVESTED, order.getStatus());
    }

    @Test
    void cancelledItemsDoNotHoldBackRemainingItems() {
        Order order = orderWith(OrderStatus.CANCELLED, OrderStatus.SHIPPED);

        order.recomputeStatus();

        assertEquals(OrderStatus.SHIPPED, order.getStatus());
    }

    private Order orderWith(OrderStatus... statuses) {
        Order order = new Order();
        List<OrderItem> items = java.util.Arrays.stream(statuses).map(status -> {
            OrderItem item = new OrderItem();
            item.setStatus(status);
            return item;
        }).toList();
        order.setItems(items);
        return order;
    }
}
