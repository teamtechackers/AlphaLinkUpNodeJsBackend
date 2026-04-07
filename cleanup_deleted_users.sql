DELETE FROM user_job_details WHERE user_id IN (1, 100, 101, 102);
DELETE FROM user_event_details WHERE user_id IN (1, 100, 101, 102);
DELETE FROM user_service_provider WHERE user_id IN (1, 100, 101, 102);
DELETE FROM user_investor WHERE user_id IN (1, 100, 101, 102);
DELETE FROM user_chats WHERE sender_id IN (1, 100, 101, 102) OR receiver_id IN (1, 100, 101, 102);
DELETE FROM user_contacts WHERE user_id IN (1, 100, 101, 102);
DELETE FROM user_investors_unlocked WHERE user_id IN (1, 100, 101, 102);
DELETE FROM fcm_tokens WHERE user_id IN (1, 100, 101, 102);
DELETE FROM users WHERE user_id IN (1, 100, 101, 102);
