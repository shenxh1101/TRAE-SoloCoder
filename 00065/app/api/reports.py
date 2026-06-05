from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import pandas as pd
import io
import os
from ..database import get_db
from .. import models
from ..security import require_role, get_current_active_user

router = APIRouter(prefix="/reports", tags=["报表导出"])


@router.get("/usage-export")
async def export_usage_report(
    tenant_id: int = None,
    start_date: str = None,
    end_date: str = None,
    usage_type: models.DeviceType = None,
    format: str = "excel",
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(
        models.UsageRecord,
        models.Tenant.name.label("tenant_name"),
        models.Device.device_name
    ).join(
        models.Tenant, models.UsageRecord.tenant_id == models.Tenant.id
    ).join(
        models.Device, models.UsageRecord.device_id == models.Device.id
    )
    
    if current_user.role == models.UserRole.TENANT:
        query = query.where(models.UsageRecord.tenant_id == current_user.tenant_id)
    elif tenant_id:
        query = query.where(models.UsageRecord.tenant_id == tenant_id)
    
    if start_date:
        query = query.where(models.UsageRecord.period >= start_date)
    if end_date:
        query = query.where(models.UsageRecord.period <= end_date)
    if usage_type:
        query = query.where(models.UsageRecord.usage_type == usage_type)
    
    result = await db.execute(query)
    records = result.all()
    
    if not records:
        raise HTTPException(status_code=404, detail="No data found for the specified period")
    
    data = []
    for record, tenant_name, device_name in records:
        data.append({
            "日期": record.period,
            "租户名称": tenant_name,
            "设备名称": device_name,
            "能耗类型": record.usage_type.value,
            "起始读数": record.start_reading,
            "结束读数": record.end_reading,
            "用量": record.usage_amount,
            "统计时段": f"{record.start_time} - {record.end_time}"
        })
    
    df = pd.DataFrame(data)
    
    filename = f"usage_report_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    
    if format == "csv":
        file_path = f"/tmp/{filename}.csv"
        df.to_csv(file_path, index=False, encoding="utf-8-sig")
        media_type = "text/csv"
    else:
        file_path = f"/tmp/{filename}.xlsx"
        df.to_excel(file_path, index=False, engine="openpyxl")
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=os.path.basename(file_path)
    )


@router.get("/billing-export")
async def export_billing_report(
    tenant_id: int = None,
    billing_month: str = None,
    status: models.BillStatus = None,
    format: str = "excel",
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(
        models.Bill,
        models.Tenant.name.label("tenant_name")
    ).join(
        models.Tenant, models.Bill.tenant_id == models.Tenant.id
    )
    
    if current_user.role == models.UserRole.TENANT:
        query = query.where(models.Bill.tenant_id == current_user.tenant_id)
    elif tenant_id:
        query = query.where(models.Bill.tenant_id == tenant_id)
    
    if billing_month:
        query = query.where(models.Bill.billing_month == billing_month)
    if status:
        query = query.where(models.Bill.status == status)
    
    result = await db.execute(query)
    bills = result.all()
    
    if not bills:
        raise HTTPException(status_code=404, detail="No data found")
    
    data = []
    for bill, tenant_name in bills:
        data.append({
            "账单编号": bill.bill_no,
            "租户名称": tenant_name,
            "账单月份": bill.billing_month,
            "用电量(kWh)": bill.electricity_usage,
            "电费(元)": bill.electricity_cost,
            "用水量(吨)": bill.water_usage,
            "水费(元)": bill.water_cost,
            "总金额(元)": bill.total_amount,
            "状态": bill.status.value,
            "到期日期": bill.due_date.strftime("%Y-%m-%d") if bill.due_date else "",
            "支付时间": bill.paid_at.strftime("%Y-%m-%d %H:%M:%S") if bill.paid_at else ""
        })
    
    df = pd.DataFrame(data)
    
    filename = f"billing_report_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    
    if format == "csv":
        file_path = f"/tmp/{filename}.csv"
        df.to_csv(file_path, index=False, encoding="utf-8-sig")
        media_type = "text/csv"
    else:
        file_path = f"/tmp/{filename}.xlsx"
        df.to_excel(file_path, index=False, engine="openpyxl")
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=os.path.basename(file_path)
    )


@router.get("/summary")
async def get_summary_stats(
    tenant_id: int = None,
    billing_month: str = None,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == models.UserRole.TENANT:
        tenant_filter = current_user.tenant_id
    else:
        tenant_filter = tenant_id
    
    bill_query = select(
        func.sum(models.Bill.total_amount).label("total_revenue"),
        func.count(models.Bill.id).label("total_bills"),
        func.sum(models.Bill.electricity_usage).label("total_electricity"),
        func.sum(models.Bill.water_usage).label("total_water")
    )
    
    if tenant_filter:
        bill_query = bill_query.where(models.Bill.tenant_id == tenant_filter)
    if billing_month:
        bill_query = bill_query.where(models.Bill.billing_month == billing_month)
    
    bill_result = await db.execute(bill_query)
    bill_stats = bill_result.first()
    
    alert_query = select(func.count(models.Alert.id)).where(models.Alert.is_resolved == False)
    if tenant_filter:
        alert_query = alert_query.where(models.Alert.tenant_id == tenant_filter)
    
    alert_result = await db.execute(alert_query)
    pending_alerts = alert_result.scalar_one()
    
    wo_query = select(func.count(models.WorkOrder.id)).where(models.WorkOrder.status == models.WorkOrderStatus.PENDING)
    if tenant_filter:
        wo_query = wo_query.where(models.WorkOrder.tenant_id == tenant_filter)
    
    wo_result = await db.execute(wo_query)
    pending_work_orders = wo_result.scalar_one()
    
    tenant_query = select(func.count(models.Tenant.id)).where(models.Tenant.is_active == True)
    tenant_result = await db.execute(tenant_query)
    active_tenants = tenant_result.scalar_one()
    
    return {
        "total_revenue": bill_stats.total_revenue or 0,
        "total_bills": bill_stats.total_bills or 0,
        "total_electricity_usage": bill_stats.total_electricity or 0,
        "total_water_usage": bill_stats.total_water or 0,
        "pending_alerts": pending_alerts or 0,
        "pending_work_orders": pending_work_orders or 0,
        "active_tenants": active_tenants or 0
    }
