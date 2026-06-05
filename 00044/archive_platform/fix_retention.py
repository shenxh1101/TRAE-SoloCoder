#!/usr/bin/env python3
import os, sys
os.environ.pop("http_proxy", None)
os.environ.pop("https_proxy", None)
sys.path.insert(0, "/Users/mac/AI Coding/solo coder/00044/archive_platform")

from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import Archive

db = SessionLocal()
now = datetime.utcnow()

# Update some archives to expire soon
for aid in [9, 11, 14, 16]:
    a = db.query(Archive).filter(Archive.id == aid).first()
    if a:
        print(f"BEFORE: ID={a.id} {a.archive_no} end={a.retention_end_date}")

# Set archive 14 to expire in 10 days
a14 = db.query(Archive).filter(Archive.id == 14).first()
if a14:
    a14.retention_end_date = now + timedelta(days=10)
    a14.retention_years = 1
    print(f"SET ID=14 to expire in 10 days")

# Set archive 16 to expire in 5 days
a16 = db.query(Archive).filter(Archive.id == 16).first()
if a16:
    a16.retention_end_date = now + timedelta(days=5)
    a16.retention_years = 1
    print(f"SET ID=16 to expire in 5 days")

# Set archive 11 to expired 10 days ago
a11 = db.query(Archive).filter(Archive.id == 11).first()
if a11:
    a11.retention_end_date = now - timedelta(days=10)
    a11.retention_years = 1
    print(f"SET ID=11 to expired 10 days ago")

# Set archive 9 to expired 30 days ago
a9 = db.query(Archive).filter(Archive.id == 9).first()
if a9:
    a9.retention_end_date = now - timedelta(days=30)
    a9.retention_years = 1
    print(f"SET ID=9 to expired 30 days ago")

db.commit()

# Verify
for aid in [9, 11, 14, 16]:
    a = db.query(Archive).filter(Archive.id == aid).first()
    if a:
        days = (a.retention_end_date - now).days
        print(f"AFTER: ID={a.id} {a.archive_no} end={a.retention_end_date} days_left={days}")

# Test the actual query
alert_date = now + timedelta(days=30)
expiring = db.query(Archive).filter(
    Archive.status == "active",
    Archive.retention_end_date != None,
    Archive.retention_end_date <= alert_date,
    Archive.retention_end_date >= now,
).all()
print(f"\nExpiring soon: {len(expiring)}")
for a in expiring:
    print(f"  {a.archive_no} {a.title} days_left={(a.retention_end_date-now).days}")

expired = db.query(Archive).filter(
    Archive.status == "active",
    Archive.retention_end_date != None,
    Archive.retention_end_date < now,
).all()
print(f"Expired: {len(expired)}")
for a in expired:
    print(f"  {a.archive_no} {a.title} expired_days={(now-a.retention_end_date).days}")

db.close()
