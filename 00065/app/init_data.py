import asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from .database import AsyncSessionLocal, engine, Base
from . import models
from .security import get_password_hash


async def init_sample_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        admin = models.User(
            username="admin",
            email="admin@example.com",
            full_name="系统管理员",
            hashed_password=get_password_hash("admin123"),
            role=models.UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        
        property_user = models.User(
            username="property",
            email="property@example.com",
            full_name="物业管理员",
            hashed_password=get_password_hash("prop123"),
            role=models.UserRole.PROPERTY,
            is_active=True
        )
        db.add(property_user)
        
        tenant1 = models.Tenant(
            name="科技有限公司A",
            contact_person="张三",
            contact_phone="13800138001",
            contact_email="zhangsan@tech-a.com",
            building="A栋",
            floor="3层",
            room="301-305",
            area=500.0,
            is_active=True
        )
        db.add(tenant1)
        await db.flush()
        
        tenant_user1 = models.User(
            username="tenant1",
            email="tenant1@example.com",
            full_name="科技A-管理员",
            hashed_password=get_password_hash("tenant123"),
            role=models.UserRole.TENANT,
            tenant_id=tenant1.id,
            is_active=True
        )
        db.add(tenant_user1)
        
        tenant2 = models.Tenant(
            name="贸易有限公司B",
            contact_person="李四",
            contact_phone="13800138002",
            contact_email="lisi@trade-b.com",
            building="A栋",
            floor="5层",
            room="501-503",
            area=300.0,
            is_active=True
        )
        db.add(tenant2)
        await db.flush()
        
        electric_device1 = models.Device(
            device_code="ELEC-A-001",
            device_name="3层总电表",
            device_type=models.DeviceType.ELECTRICITY,
            tenant_id=tenant1.id,
            location="A栋3层配电室",
            installation_date=datetime.now() - timedelta(days=180),
            last_reading=10000.0,
            last_reading_time=datetime.now(),
            is_active=True
        )
        db.add(electric_device1)
        
        water_device1 = models.Device(
            device_code="WATER-A-001",
            device_name="3层总水表",
            device_type=models.DeviceType.WATER,
            tenant_id=tenant1.id,
            location="A栋3层设备间",
            installation_date=datetime.now() - timedelta(days=180),
            last_reading=500.0,
            last_reading_time=datetime.now(),
            is_active=True
        )
        db.add(water_device1)
        
        electric_device2 = models.Device(
            device_code="ELEC-A-002",
            device_name="5层总电表",
            device_type=models.DeviceType.ELECTRICITY,
            tenant_id=tenant2.id,
            location="A栋5层配电室",
            installation_date=datetime.now() - timedelta(days=180),
            last_reading=8000.0,
            last_reading_time=datetime.now(),
            is_active=True
        )
        db.add(electric_device2)
        
        await db.flush()
        
        contract1 = models.Contract(
            contract_code="CT2024001",
            tenant_id=tenant1.id,
            name="科技A-2024年能耗合同",
            start_date=datetime.now() - timedelta(days=30),
            end_date=datetime.now() + timedelta(days=335),
            is_active=True
        )
        db.add(contract1)
        await db.flush()
        
        electric_pricing1 = models.PricingRule(
            contract_id=contract1.id,
            utility_type=models.DeviceType.ELECTRICITY,
            pricing_type=models.PricingType.TIERED,
            rules={
                "tiers": [
                    {"min_usage": 0, "max_usage": 2000, "unit_price": 0.85},
                    {"min_usage": 2000, "max_usage": 5000, "unit_price": 1.00},
                    {"min_usage": 5000, "max_usage": float("inf"), "unit_price": 1.20}
                ]
            }
        )
        db.add(electric_pricing1)
        
        water_pricing1 = models.PricingRule(
            contract_id=contract1.id,
            utility_type=models.DeviceType.WATER,
            pricing_type=models.PricingType.FLAT,
            rules={"unit_price": 5.50}
        )
        db.add(water_pricing1)
        
        contract2 = models.Contract(
            contract_code="CT2024002",
            tenant_id=tenant2.id,
            name="贸易B-2024年能耗合同",
            start_date=datetime.now() - timedelta(days=30),
            end_date=datetime.now() + timedelta(days=335),
            is_active=True
        )
        db.add(contract2)
        await db.flush()
        
        electric_pricing2 = models.PricingRule(
            contract_id=contract2.id,
            utility_type=models.DeviceType.ELECTRICITY,
            pricing_type=models.PricingType.TIME_OF_USE,
            rules={
                "default_price": 0.90,
                "periods": [
                    {"name": "peak", "start": "08:00", "end": "22:00", "price": 1.20},
                    {"name": "valley", "start": "22:00", "end": "08:00", "price": 0.50}
                ]
            }
        )
        db.add(electric_pricing2)
        
        water_pricing2 = models.PricingRule(
            contract_id=contract2.id,
            utility_type=models.DeviceType.WATER,
            pricing_type=models.PricingType.FLAT,
            rules={"unit_price": 5.00}
        )
        db.add(water_pricing2)
        
        prepaid1 = models.PrepaidAccount(
            tenant_id=tenant1.id,
            balance=5000.0,
            safety_threshold=500.0,
            is_active=True
        )
        db.add(prepaid1)
        
        prepaid2 = models.PrepaidAccount(
            tenant_id=tenant2.id,
            balance=3000.0,
            safety_threshold=300.0,
            is_active=True
        )
        db.add(prepaid2)
        
        await db.commit()
        print("Sample data initialized successfully!")
        print("Admin: admin / admin123")
        print("Property: property / prop123")
        print("Tenant1: tenant1 / tenant123")


if __name__ == "__main__":
    asyncio.run(init_sample_data())
