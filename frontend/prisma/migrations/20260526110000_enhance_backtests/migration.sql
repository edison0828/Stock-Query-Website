ALTER TABLE `backtestruns`
  MODIFY COLUMN `short_window` INTEGER NULL,
  MODIFY COLUMN `long_window` INTEGER NULL,
  ADD COLUMN `parameters` JSON NULL AFTER `long_window`,
  ADD COLUMN `execution_config` JSON NULL AFTER `parameters`,
  ADD COLUMN `annualized_return_percent` DECIMAL(10, 4) NULL AFTER `execution_config`,
  ADD COLUMN `profit_factor` DECIMAL(10, 4) NULL AFTER `annualized_return_percent`,
  ADD COLUMN `average_win_percent` DECIMAL(10, 4) NULL AFTER `profit_factor`,
  ADD COLUMN `average_loss_percent` DECIMAL(10, 4) NULL AFTER `average_win_percent`,
  ADD COLUMN `max_consecutive_losses` INTEGER NULL AFTER `average_loss_percent`;

ALTER TABLE `backtesttrades`
  ADD COLUMN `gross_amount` DECIMAL(18, 6) NULL AFTER `return_percent`,
  ADD COLUMN `fee_amount` DECIMAL(18, 6) NULL AFTER `gross_amount`,
  ADD COLUMN `tax_amount` DECIMAL(18, 6) NULL AFTER `fee_amount`,
  ADD COLUMN `net_amount` DECIMAL(18, 6) NULL AFTER `tax_amount`,
  ADD COLUMN `position_after` DECIMAL(18, 6) NULL AFTER `net_amount`;

ALTER TABLE `backtestruns`
  MODIFY COLUMN `strategy_type` ENUM('MOVING_AVERAGE_CROSS', 'RSI_REVERSION', 'BREAKOUT') NOT NULL;
