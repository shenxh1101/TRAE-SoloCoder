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

archives = db.query(Archive).filter(
    Archive.status == "active",
    Archive.retention_end_date != None,
).limit(5).all()

for a in archives:
    end = a.retention_end_date
    print(f"ID={a.id} type={type(end).__name__} val={end} repr={repr(end)}")
    if isinstance(end, str):
        print(f"  STRING comparison: {end < str(now)}")
        print(f"  str(now)={str(now)}")
    elif isinstance(end, datetime):
        print(f"  DATETIME comparison: days_left={(end-now).days}")

db.close()
