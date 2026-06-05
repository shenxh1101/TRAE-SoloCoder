import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import engine, Base
from app.models import *  # noqa: F401 F403
from app.routers import auth_router, archives, borrow, copy, destruction, dashboard, notifications, admin
from app.services.background import run_all_tasks

logging.basicConfig(level=logging.INFO)

Base.metadata.create_all(bind=engine)

scheduler = BackgroundScheduler()
scheduler.add_job(run_all_tasks, "interval", minutes=5, id="bg_tasks")
scheduler.start()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    scheduler.shutdown()


app = FastAPI(title="企业档案管理与借阅平台", version="1.0.0", lifespan=lifespan)

app.include_router(auth_router.router)
app.include_router(archives.router)
app.include_router(borrow.router)
app.include_router(copy.router)
app.include_router(destruction.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(admin.router)

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
def serve_index():
    index_path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "企业档案管理与借阅平台 API", "docs": "/docs"}
