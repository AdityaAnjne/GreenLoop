ALTER TABLE users
ADD COLUMN delivery_address VARCHAR(500) NULL,
ADD COLUMN delivery_latitude DOUBLE NULL,
ADD COLUMN delivery_longitude DOUBLE NULL;