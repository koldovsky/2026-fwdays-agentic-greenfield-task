-- CreateTable
CREATE TABLE `ticket_feed_item` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `ticket_id` BIGINT NOT NULL,
    `author_id` BIGINT NOT NULL,
    `type` ENUM('NOTE', 'EVENT') NOT NULL,
    `text` TEXT NULL,
    `field` ENUM('STATUS', 'HOUSE', 'CATEGORY', 'PRIORITY', 'EXECUTOR', 'DUE_DATE') NULL,
    `old_value` VARCHAR(255) NULL,
    `new_value` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ticket_feed_item_ticket_id_id_idx`(`ticket_id`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ticket_feed_item` ADD CONSTRAINT `ticket_feed_item_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `ticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_feed_item` ADD CONSTRAINT `ticket_feed_item_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
