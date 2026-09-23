-- ============================================================================
-- GreenLoop — Full Database
-- ============================================================================

-- ============================================================================
-- 1. Multi-retailer order fix — status/distributor moved from Order to
--    OrderItem
-- ============================================================================
-- WHY: A single order can contain products from multiple retailers (e.g.
-- chillies from Retailer A, peas from Retailer B, bought together in one
-- checkout). Originally, fulfillment status and the assigned distributor
-- lived on the whole Order — so confirming "the order" let ANY retailer
-- with an item in it confirm every retailer's items, and pick a distributor
-- for goods that weren't theirs. Moving these two fields down to OrderItem
-- means each retailer's slice of the order progresses independently.
--
-- [Reconstructed — applied directly via terminal, no .sql file was saved
--  at the time]

ALTER TABLE order_items
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PLACED',
ADD COLUMN distributor_id BIGINT NULL;

-- Backfill: every existing item's true historical status/distributor WAS
-- whatever its parent order's status/distributor was, since that's exactly
-- the bug being fixed — this restores the correct value, not a guess.
UPDATE order_items oi
JOIN orders o ON oi.order_id = o.id
SET oi.status = o.status,
    oi.distributor_id = o.distributor_id;

ALTER TABLE order_items
ADD INDEX idx_order_items_status (status),
ADD INDEX idx_order_items_distributor_id (distributor_id);


-- ============================================================================
-- 2. retailer_distributors table
-- ============================================================================
-- WHY: Tracks which distributors a retailer has worked with, recorded the
-- first time a retailer confirms an order and assigns a distributor to it.
--
-- [Reconstructed — applied directly via terminal, no .sql file was saved
--  at the time]

CREATE TABLE retailer_distributors (
    id BIGINT NOT NULL AUTO_INCREMENT,
    retailer_id BIGINT NOT NULL,
    distributor_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_retailer_distributor (retailer_id, distributor_id)
);


-- ============================================================================
-- 3. farmer_retailers table
-- ============================================================================
-- WHY: Tracks which retailers a farmer has assigned products to — backs the
-- FarmerRetailer entity used when a farmer lists a product for a retailer.
--
-- [Reconstructed — applied directly via terminal, no .sql file was saved
--  at the time]

CREATE TABLE farmer_retailers (
    id BIGINT NOT NULL AUTO_INCREMENT,
    farmer_id BIGINT NOT NULL,
    retailer_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_farmer_retailer (farmer_id, retailer_id)
);


-- ============================================================================
-- 4. order_item_status_events table — farm-to-table traceability timeline
-- ============================================================================
-- WHY: OrderItem only ever stores its CURRENT status. This table is the
-- append-only history behind it — one row per transition (PLACED ->
-- CONFIRMED -> PACKED -> SHIPPED -> DELIVERED/CANCELLED), with a timestamp
-- and a human-readable note, so a customer can see the full journey of
-- their order, not just where it stands right now.

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


-- ============================================================================
-- 5. orders — delivery address + geolocation
-- ============================================================================
-- WHY: Added at checkout so a customer's order records where it should
-- actually be delivered, including real GPS coordinates captured via the
-- browser's geolocation API (nullable, since permission can be denied).

ALTER TABLE orders
ADD COLUMN delivery_address VARCHAR(500) NULL,
ADD COLUMN delivery_latitude DOUBLE NULL,
ADD COLUMN delivery_longitude DOUBLE NULL;


-- ============================================================================
-- 6. orders — payment method
-- ============================================================================
-- WHY: Supports the checkout payment-method selector. Only Cash on Delivery
-- is a real, processed path currently; UPI/Card/Wallet are shown in the UI
-- as "Coming soon" pending a real payment gateway integration.

ALTER TABLE orders
ADD COLUMN payment_method VARCHAR(20) NULL DEFAULT 'COD';


-- ============================================================================
-- 7. users — saved default delivery address
-- ============================================================================
-- WHY: After a customer's first order, their address/coordinates are saved
-- to their account and used to pre-fill checkout next time — editable per
-- order, but remembered as the default going forward.

ALTER TABLE users
ADD COLUMN delivery_address VARCHAR(500) NULL,
ADD COLUMN delivery_latitude DOUBLE NULL,
ADD COLUMN delivery_longitude DOUBLE NULL;


-- ============================================================================
-- 8. products — AI quality score
-- ============================================================================
-- WHY: The AI quality check moved from a disconnected post-purchase tool to
-- running at LISTING time, on the actual photo the farmer uploads. The
-- result becomes a permanent part of the product record, visible to any
-- customer before they buy.

ALTER TABLE products
ADD COLUMN quality_score DOUBLE NULL,
ADD COLUMN quality_analysis VARCHAR(1000) NULL;


-- ============================================================================
-- 9. products — AI freshness percentage
-- ============================================================================
-- WHY: Captures the AI's actual freshness assessment (0-100%), previously
-- only a random Math.random() placeholder shown on the customer's product
-- cards. The star rating is derived from this value so the two always
-- agree with each other.

ALTER TABLE products
ADD COLUMN freshness_percent INT NULL;


-- ============================================================================
-- 10. products — AI-generated health benefit / description / shelf life
-- ============================================================================
-- WHY: Extends the SAME Gemini call already made at listing time (no extra
-- API cost) to also generate real, product-specific content for the "View
-- Details" panel — works for any crop, not just ones with hardcoded
-- fallback text.

ALTER TABLE products
ADD COLUMN ai_health_benefit VARCHAR(500) NULL,
ADD COLUMN ai_description VARCHAR(500) NULL,
ADD COLUMN ai_shelf_life VARCHAR(100) NULL;


-- ============================================================================
-- Verification — run these any time to confirm both databases are in sync
-- ============================================================================
-- SHOW TABLES;
-- DESCRIBE order_items;
-- DESCRIBE orders;
-- DESCRIBE users;
-- DESCRIBE products;
-- SELECT COUNT(*) FROM retailer_distributors;
-- SELECT COUNT(*) FROM farmer_retailers;
-- SELECT COUNT(*) FROM order_item_status_events;