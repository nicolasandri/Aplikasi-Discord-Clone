SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages' AND column_name IN ('id', 'user_id', 'channel_id');
