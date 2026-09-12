CREATE TABLE order_item_status_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_item_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    actor_id BIGINT NULL,
    note VARCHAR(200) NULL,
    occurred_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_order_item_status_events_item (order_item_id)
);