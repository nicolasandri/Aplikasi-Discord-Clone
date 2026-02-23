#!/bin/bash

# ============================================
# Setup Automated Backup with Cron
# ============================================

echo "========================================"
echo " Discord Clone - Cron Backup Setup"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get current crontab
current_crontab=$(crontab -l 2>/dev/null || echo "")

# Check if already configured
if echo "$current_crontab" | grep -q "discord-clone"; then
    echo -e "${YELLOW}Cron jobs for Discord Clone already configured.${NC}"
    echo "Current cron jobs:"
    echo "$current_crontab" | grep "discord-clone"
    echo ""
    read -p "Do you want to reconfigure? (y/n): " reconfigure
    if [ "$reconfigure" != "y" ]; then
        echo "Exiting..."
        exit 0
    fi
fi

echo "Choose backup schedule:"
echo "1) Daily at 2:00 AM (recommended)"
echo "2) Twice daily (2:00 AM and 2:00 PM)"
echo "3) Weekly (Sunday at 2:00 AM)"
echo "4) Custom schedule"
read -p "Select option (1-4): " schedule_option

case $schedule_option in
    1)
        CRON_SCHEDULE="0 2 * * *"
        echo "Selected: Daily at 2:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 2,14 * * *"
        echo "Selected: Twice daily"
        ;;
    3)
        CRON_SCHEDULE="0 2 * * 0"
        echo "Selected: Weekly on Sunday"
        ;;
    4)
        echo ""
        echo "Enter custom cron schedule:"
        echo "Format: minute hour day month day_of_week"
        echo "Examples:"
        echo "  0 2 * * *     = Daily at 2:00 AM"
        echo "  0 */6 * * *   = Every 6 hours"
        echo "  0 2 * * 0     = Weekly on Sunday"
        read -p "Cron schedule: " CRON_SCHEDULE
        ;;
    *)
        echo "Invalid option, using default (daily at 2:00 AM)"
        CRON_SCHEDULE="0 2 * * *"
        ;;
esac

# Setup backup script path
PROJECT_DIR="$HOME/Aplikasi-Discord-Clone"
BACKUP_SCRIPT="$PROJECT_DIR/deployment/cron-backup.sh"

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Create new crontab
new_crontab="$current_crontab

# Discord Clone Automated Backup
$CRON_SCHEDULE cd $PROJECT_DIR && $BACKUP_SCRIPT >> ~/cron-backup.log 2>&1

# Discord Clone Cleanup Old Backups (run 1 hour after backup)
0 3 * * * find $PROJECT_DIR/backups -name \"discord_clone_*.tar.gz\" -mtime +7 -delete 2>/dev/null
"

# Install new crontab
echo "$new_crontab" | crontab -

echo ""
echo -e "${GREEN}Cron jobs configured successfully!${NC}"
echo ""
echo "Cron schedule: $CRON_SCHEDULE"
echo "Backup script: $BACKUP_SCRIPT"
echo "Log file: ~/cron-backup.log"
echo ""
echo "Current crontab:"
crontab -l | grep -A 2 "Discord Clone"
echo ""
echo "To test backup manually, run:"
echo "  $BACKUP_SCRIPT"
