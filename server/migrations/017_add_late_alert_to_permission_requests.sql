-- Migration 017: Add late alert columns to permission_requests table

-- Add late_alert_sent column
ALTER TABLE permission_requests 
ADD COLUMN IF NOT EXISTS late_alert_sent BOOLEAN DEFAULT false;

-- Add late_alert_sent_at column
ALTER TABLE permission_requests 
ADD COLUMN IF NOT EXISTS late_alert_sent_at TIMESTAMP DEFAULT NULL;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_permission_requests_late_alert 
ON permission_requests(late_alert_sent) 
WHERE status = 'active';

-- Add comment
COMMENT ON COLUMN permission_requests.late_alert_sent IS 'Flag indicating if late alert has been sent for this request';
COMMENT ON COLUMN permission_requests.late_alert_sent_at IS 'Timestamp when late alert was sent';
