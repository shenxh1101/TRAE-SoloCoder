from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import engine, Base
from .api import auth, tenants, devices, contracts, meter_readings, bills, prepaid, analytics, work_orders, reports, notifications
from .scheduler import start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    scheduler = start_scheduler()
    
    yield
    
    scheduler.shutdown()


app = FastAPI(
    title="智慧园区能耗监测与计费系统",
    description="智慧园区能耗监测与计费系统后端API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tenants.router)
app.include_router(devices.router)
app.include_router(contracts.router)
app.include_router(meter_readings.router)
app.include_router(bills.router)
app.include_router(prepaid.router)
app.include_router(analytics.router)
app.include_router(work_orders.router)
app.include_router(reports.router)
app.include_router(notifications.router)


@app.get("/")
async def root():
    return {"message": "智慧园区能耗监测与计费系统 API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
