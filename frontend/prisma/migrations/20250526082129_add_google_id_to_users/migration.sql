-- CreateTable
CREATE TABLE `dividends` (
    `dividend_id` BIGINT NOT NULL AUTO_INCREMENT,
    `stock_id` BIGINT NOT NULL,
    `ex_dividend_date` DATE NOT NULL,
    `payment_date` DATE NULL,
    `amount_per_share` DECIMAL(10, 4) NOT NULL,

    INDEX `fk_Dividends_Stocks1_idx`(`stock_id`),
    PRIMARY KEY (`dividend_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exchanges` (
    `exchange_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `abbreviation` VARCHAR(50) NOT NULL,
    `country` VARCHAR(100) NULL,
    `timezone` VARCHAR(100) NULL,

    UNIQUE INDEX `name`(`name`),
    UNIQUE INDEX `abbreviation`(`abbreviation`),
    PRIMARY KEY (`exchange_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financialreports` (
    `report_id` BIGINT NOT NULL AUTO_INCREMENT,
    `stock_id` BIGINT NOT NULL,
    `report_date` DATE NOT NULL,
    `period_type` VARCHAR(20) NOT NULL,
    `filing_date` DATE NULL,
    `currency` VARCHAR(10) NOT NULL,
    `revenue` DECIMAL(20, 2) NULL,
    `net_income` DECIMAL(20, 2) NULL,
    `eps` DECIMAL(10, 4) NULL,
    `total_assets` DECIMAL(20, 2) NULL,
    `total_liabilities` DECIMAL(20, 2) NULL,
    `shareholder_equity` DECIMAL(20, 2) NULL,

    INDEX `fk_FinancialReports_Stocks1_idx`(`stock_id`),
    UNIQUE INDEX `uq_stock_report_period`(`stock_id`, `report_date`, `period_type`),
    PRIMARY KEY (`report_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historicalprices` (
    `stock_id` VARCHAR(20) NOT NULL,
    `date` DATE NOT NULL,
    `open_price` DECIMAL(18, 6) NULL,
    `high_price` DECIMAL(18, 6) NULL,
    `low_price` DECIMAL(18, 6) NULL,
    `close_price` DECIMAL(18, 6) NULL,
    `adjusted_close_price` DECIMAL(18, 6) NULL,
    `volume` BIGINT NULL,

    PRIMARY KEY (`stock_id`, `date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portfolios` (
    `portfolio_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `portfolio_name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_Portfolios_Users1_idx`(`user_id`),
    UNIQUE INDEX `uq_user_portfolio_name`(`user_id`, `portfolio_name`),
    PRIMARY KEY (`portfolio_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stocks` (
    `stock_id` BIGINT NOT NULL,
    `ticker_symbol` VARCHAR(20) NOT NULL,
    `company_name` VARCHAR(255) NOT NULL,
    `market_type` VARCHAR(255) NOT NULL,
    `security_status` VARCHAR(255) NOT NULL,
    `exchange_id` INTEGER NOT NULL,
    `transfer_agent` VARCHAR(255) NOT NULL,
    `currency` VARCHAR(10) NOT NULL,

    UNIQUE INDEX `ticker_symbol`(`ticker_symbol`),
    INDEX `exchange_id`(`exchange_id`),
    PRIMARY KEY (`stock_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stocksplits` (
    `split_id` BIGINT NOT NULL AUTO_INCREMENT,
    `stock_id` BIGINT NOT NULL,
    `split_date` DATE NOT NULL,
    `split_ratio_before` DECIMAL(10, 4) NOT NULL,
    `split_ratio_after` DECIMAL(10, 4) NOT NULL,

    INDEX `fk_StockSplits_Stocks1_idx`(`stock_id`),
    PRIMARY KEY (`split_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test` (
    `stock_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `open` FLOAT NOT NULL,
    `close` FLOAT NOT NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `transaction_id` BIGINT NOT NULL AUTO_INCREMENT,
    `portfolio_id` BIGINT NOT NULL,
    `stock_id` BIGINT NOT NULL,
    `transaction_type` ENUM('BUY', 'SELL') NOT NULL,
    `transaction_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `quantity` DECIMAL(18, 6) NOT NULL,
    `price_per_share` DECIMAL(18, 6) NOT NULL,
    `commission` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `currency` VARCHAR(10) NOT NULL,

    INDEX `fk_Transactions_Portfolios1_idx`(`portfolio_id`),
    INDEX `fk_Transactions_Stocks1_idx`(`stock_id`),
    PRIMARY KEY (`transaction_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `google_id` VARCHAR(191) NULL,
    `user_id` BIGINT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'user',
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_login` TIMESTAMP(0) NULL,

    UNIQUE INDEX `users_google_id_key`(`google_id`),
    UNIQUE INDEX `username_UNIQUE`(`username`),
    UNIQUE INDEX `email_UNIQUE`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `watchlistitems` (
    `user_id` BIGINT NOT NULL,
    `stock_id` BIGINT NOT NULL,
    `added_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `notes` TEXT NULL,

    INDEX `fk_WatchlistItems_Stocks1_idx`(`stock_id`),
    PRIMARY KEY (`user_id`, `stock_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dividends` ADD CONSTRAINT `fk_Dividends_Stocks1` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`stock_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financialreports` ADD CONSTRAINT `fk_FinancialReports_Stocks1` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`stock_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historicalprices` ADD CONSTRAINT `historicalprices_ibfk_1` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`ticker_symbol`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `portfolios` ADD CONSTRAINT `fk_Portfolios_Users1` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_ibfk_1` FOREIGN KEY (`exchange_id`) REFERENCES `exchanges`(`exchange_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stocksplits` ADD CONSTRAINT `fk_StockSplits_Stocks1` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`stock_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `fk_Transactions_Portfolios1` FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`portfolio_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `fk_Transactions_Stocks1` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`stock_id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `watchlistitems` ADD CONSTRAINT `fk_WatchlistItems_Stocks1` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`stock_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `watchlistitems` ADD CONSTRAINT `fk_WatchlistItems_Users1` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
