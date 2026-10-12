-- Optional GPS checkpoints shared by distributors for shipped order items.
ALTER TABLE order_item_status_events
    ADD COLUMN latitude DOUBLE NULL,
    ADD COLUMN longitude DOUBLE NULL;
