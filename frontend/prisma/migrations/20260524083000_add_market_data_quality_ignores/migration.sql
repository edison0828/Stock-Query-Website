CREATE TABLE `marketdataqualityignores` (
  `ignore_id` BIGINT NOT NULL AUTO_INCREMENT,
  `stock_id` VARCHAR(20) NOT NULL,
  `check_type` VARCHAR(80) NOT NULL,
  `reason` TEXT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `created_by_user_id` BIGINT NULL,

  UNIQUE INDEX `uq_marketdataqualityignores_stock_check`(`stock_id`, `check_type`),
  INDEX `fk_MarketDataQualityIgnores_Users1_idx`(`created_by_user_id`),
  INDEX `idx_marketdataqualityignores_check_type`(`check_type`),
  PRIMARY KEY (`ignore_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `marketdataqualityignores`
  ADD CONSTRAINT `fk_MarketDataQualityIgnores_Stocks1`
  FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`stock_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `marketdataqualityignores`
  ADD CONSTRAINT `fk_MarketDataQualityIgnores_Users1`
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`user_id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
