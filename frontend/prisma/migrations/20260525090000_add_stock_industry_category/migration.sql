ALTER TABLE `stocks`
  ADD COLUMN `industry_category` VARCHAR(100) NULL AFTER `asset_type`;

CREATE INDEX `idx_stocks_industry_category` ON `stocks`(`industry_category`);
