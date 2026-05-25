CREATE TABLE `etfprofiles` (
  `stock_id` VARCHAR(20) NOT NULL,
  `fund_short_name` VARCHAR(255) NULL,
  `fund_name` VARCHAR(255) NULL,
  `fund_english_name` VARCHAR(255) NULL,
  `issuer` VARCHAR(255) NULL,
  `etf_category` VARCHAR(255) NULL,
  `tracking_index` VARCHAR(500) NULL,
  `is_custom_index` VARCHAR(100) NULL,
  `has_foreign_components` BOOLEAN NULL,
  `benchmark_name` VARCHAR(255) NULL,
  `benchmark_english_name` VARCHAR(255) NULL,
  `inception_date` DATE NULL,
  `listing_date` DATE NULL,
  `fund_manager` VARCHAR(100) NULL,
  `custodian` VARCHAR(255) NULL,
  `units_outstanding` BIGINT NULL,
  `mops_fund_id` VARCHAR(50) NULL,
  `detail_url` VARCHAR(500) NULL,
  `expense_ratio` DECIMAL(10, 4) NULL,
  `expense_ratio_period` VARCHAR(50) NULL,
  `fee_source` VARCHAR(100) NULL,
  `data_source` VARCHAR(100) NOT NULL DEFAULT 'FINLAB_TWSE_OPENAPI',
  `source_as_of_date` DATE NULL,
  `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

  INDEX `idx_etfprofiles_category`(`etf_category`),
  INDEX `idx_etfprofiles_tracking_index`(`tracking_index`),
  INDEX `idx_etfprofiles_issuer`(`issuer`),
  PRIMARY KEY (`stock_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `etfnavsnapshots` (
  `nav_id` BIGINT NOT NULL AUTO_INCREMENT,
  `stock_id` VARCHAR(20) NOT NULL,
  `date` DATE NOT NULL,
  `nav` DECIMAL(18, 6) NULL,
  `premium_discount` DECIMAL(10, 4) NULL,
  `data_source` VARCHAR(100) NOT NULL DEFAULT 'FINLAB',
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

  UNIQUE INDEX `uq_etfnavsnapshots_stock_date`(`stock_id`, `date`),
  INDEX `idx_etfnavsnapshots_stock_date`(`stock_id`, `date` DESC),
  PRIMARY KEY (`nav_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `etfprofiles`
  ADD CONSTRAINT `fk_EtfProfiles_Stocks1`
  FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`stock_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `etfnavsnapshots`
  ADD CONSTRAINT `fk_EtfNavSnapshots_Stocks1`
  FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`stock_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
