-- CreateTable
CREATE TABLE `ticket` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `house_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category` ENUM('PLUMBING', 'HEATING', 'ELECTRICITY', 'ELEVATOR', 'ROOF_FACADE', 'COMMON_AREAS', 'GROUNDS', 'ACCESS_SYSTEMS', 'OTHER') NOT NULL,
    `priority` ENUM('EMERGENCY', 'HIGH', 'NORMAL') NOT NULL DEFAULT 'NORMAL',
    `status` ENUM('NEW', 'IN_PROGRESS', 'DONE', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'NEW',
    `requester_name` VARCHAR(255) NULL,
    `requester_phone` VARCHAR(32) NULL,
    `executor` VARCHAR(255) NULL,
    `due_date` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ticket_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ticket` ADD CONSTRAINT `ticket_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket` ADD CONSTRAINT `ticket_house_id_fkey` FOREIGN KEY (`house_id`) REFERENCES `house`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
