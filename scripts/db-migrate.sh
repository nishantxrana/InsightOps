
#!/bin/bash

# Enter your details here
DB_NAME="YOUR_DATABASE_NAME"
SOURCE_URI="YOUR_OLD_MONGODB_CONNECTION_STRING"
DEST_URI="YOUR_NEW_MONGODB_CONNECTION_STRING"

BACKUP="migration_backup.archive.gz"

echo "Starting migration..."

# Step 1: Backup source database
mongodump.exe \
  --uri="$SOURCE_URI" \
  --db="$DB_NAME" \
  --archive="$BACKUP" \
  --gzip

if [ $? -ne 0 ]; then
    echo "ERROR: Backup failed!"
    exit 1
fi

echo "Backup completed successfully."

# Step 2: Restore into destination
mongorestore.exe \
  --uri="$DEST_URI" \
  --archive="$BACKUP" \
  --gzip \
  --nsInclude="$DB_NAME.*"

if [ $? -ne 0 ]; then
    echo "ERROR: Restore failed!"
    exit 1
fi

echo "SUCCESS: Database migration completed!"
echo "Backup file: $BACKUP"
