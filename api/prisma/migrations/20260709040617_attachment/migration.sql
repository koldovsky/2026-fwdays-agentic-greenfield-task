-- AlterTable
ALTER TABLE `ticket_feed_item` MODIFY `field` ENUM('STATUS', 'HOUSE', 'CATEGORY', 'PRIORITY', 'EXECUTOR', 'DUE_DATE', 'ATTACHMENT') NULL;

-- CreateTable
CREATE TABLE `attachment` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `ticket_id` BIGINT NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `stored_name` VARCHAR(64) NOT NULL,
    `mime_type` VARCHAR(32) NOT NULL,
    `size` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `attachment_stored_name_key`(`stored_name`),
    INDEX `attachment_ticket_id_idx`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attachment` ADD CONSTRAINT `attachment_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `ticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
