-- Ensure every OrderStatus enum value, including HARVESTED, fits in the
-- aggregate order status column on existing MySQL deployments.
ALTER TABLE orders
    MODIFY COLUMN status VARCHAR(20) NOT NULL;
