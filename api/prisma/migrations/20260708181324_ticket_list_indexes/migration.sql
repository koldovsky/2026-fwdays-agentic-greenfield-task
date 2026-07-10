-- CreateIndex
CREATE INDEX `ticket_user_id_status_idx` ON `ticket`(`user_id`, `status`);

-- CreateIndex
CREATE INDEX `ticket_user_id_house_id_idx` ON `ticket`(`user_id`, `house_id`);
