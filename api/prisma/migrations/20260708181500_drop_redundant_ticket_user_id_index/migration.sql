-- DropIndex: ticket_user_id_idx is a prefix of ticket_user_id_status_idx,
-- which keeps the user_id FK requirement satisfied (S-06 design D6).
DROP INDEX `ticket_user_id_idx` ON `ticket`;
