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
alert_date = now + timedelta(days=30)

archives = db.query(Archive).filter(
    Archive.status == "active",
    Archive.retention_end_date != None,
).all()
print(f"Total with retention_end_date: {len(archives)}")

for a in archives:
    if a.retention_end_date:
        try:
            days_left = (a.retention_end_date - now).days
            if abs(days_left) < 100:
                print(f"  ID={a.id} {a.archive_no} end={a.retention_end_date} type={type(a.retention_end_date).__name__} days_left={days_left}")
        except Exception as e:
            print(f"  ID={a.id} error: {e}")

expiring = db.query(Archive).filter(
    Archive.status == "active",
    Archive.retention_end_date != None,
    Archive.retention_end_date <= alert_date,
    Archive.retention_end_date >= now,
).all()
print(f"Expiring soon: {len(expiring)}")

expired = db.query(Archive).filter(
    Archive.status == "active",
    Archive.retention_end_date != None,
    Archive.retention_end_date < now,
).all()
print(f"Expired: {len(expired)}")

db.close()
