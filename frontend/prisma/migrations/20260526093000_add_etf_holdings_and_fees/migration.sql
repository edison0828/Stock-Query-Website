ALTER TABLE `etfprofiles`
  ADD COLUMN `management_fee_rate` DECIMAL(10, 4) NULL AFTER `expense_ratio`,
  ADD COLUMN `custodian_fee_rate` DECIMAL(10, 4) NULL AFTER `management_fee_rate`;

CREATE TABLE `etfholdings` (
  `holding_id` BIGINT NOT NULL AUTO_INCREMENT,
  `stock_id` VARCHAR(20) NOT NULL,
  `component_symbol` VARCHAR(30) NOT NULL,
  `component_name` VARCHAR(255) NOT NULL,
  `snapshot_date` DATE NOT NULL,
  `weight` DECIMAL(10, 4) NULL,
  `shares` BIGINT NULL,
  `component_close_price` DECIMAL(18, 6) NULL,
  `component_change_pct` DECIMAL(10, 4) NULL,
  `contribution_pct` DECIMAL(10, 4) NULL,
  `component_industry` VARCHAR(100) NULL,
  `holding_rank` INTEGER NULL,
  `data_source` VARCHAR(100) NOT NULL DEFAULT 'ETFINFO_PUBLIC_PAGE',
  `source_url` VARCHAR(500) NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

  UNIQUE INDEX `uq_etfholdings_stock_component_date`(`stock_id`, `component_symbol`, `snapshot_date`),
  INDEX `idx_etfholdings_stock_date_weight`(`stock_id`, `snapshot_date`, `weight` DESC),
  INDEX `idx_etfholdings_component_symbol`(`component_symbol`),
  PRIMARY KEY (`holding_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `etfholdings`
  ADD CONSTRAINT `fk_EtfHoldings_Stocks1`
  FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`stock_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
