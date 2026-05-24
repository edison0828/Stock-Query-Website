ALTER TABLE `stocks`
  ADD COLUMN `asset_type` VARCHAR(20) NOT NULL DEFAULT 'STOCK' AFTER `market_type`;

CREATE INDEX `idx_stocks_asset_type` ON `stocks`(`asset_type`);
