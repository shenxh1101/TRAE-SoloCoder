from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict
import json
from datetime import datetime
from ..database import get_db
from .. import models, schemas
from ..security import get_current_active_user

router = APIRouter(prefix="/notifications", tags=["通知管理"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)

    async def broadcast(self, message: dict):
        for user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)


manager = ConnectionManager()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_personal_message(
                {"message": f"Message received: {data}", "timestamp": datetime.utcnow().isoformat()},
                user_id
            )
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


@router.get("/", response_model=List[schemas.NotificationResponse])
async def list_notifications(
    skip: int = 0,
    limit: int = 100,
    is_read: bool = None,
    notification_type: models.NotificationType = None,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.Notification).where(models.Notification.user_id == current_user.id)
    
    if is_read is not None:
        query = query.where(models.Notification.is_read == is_read)
    if notification_type:
        query = query.where(models.Notification.notification_type == notification_type)
    
    query = query.order_by(models.Notification.created_at.desc())
    result = await db.execute(query.offset(skip).limit(limit))
    notifications = result.scalars().all()
    return notifications


@router.post("/", response_model=schemas.NotificationResponse)
async def create_notification(
    user_id: int,
    notification_type: models.NotificationType,
    title: str,
    message: str,
    data: dict = None,
    db: AsyncSession = Depends(get_db)
):
    notification = models.Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        data=data
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    
    await manager.send_personal_message(
        {
            "type": notification_type.value,
            "title": title,
            "message": message,
            "data": data,
            "timestamp": notification.created_at.isoformat()
        },
        user_id
    )
    
    return notification


@router.put("/{notification_id}/read", response_model=schemas.NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Notification).where(
            and_(
                models.Notification.id == notification_id,
                models.Notification.user_id == current_user.id
            )
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification


@router.put("/mark-all-read")
async def mark_all_read(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Notification).where(
            and_(
                models.Notification.user_id == current_user.id,
                models.Notification.is_read == False
            )
        )
    )
    notifications = result.scalars().all()
    
    for notification in notifications:
        notification.is_read = True
    
    await db.commit()
    return {"message": f"Marked {len(notifications)} notifications as read"}


async def notify_tenant_users(
    db: AsyncSession,
    tenant_id: int,
    notification_type: models.NotificationType,
    title: str,
    message: str,
    data: dict = None
):
    result = await db.execute(
        select(models.User).where(
            and_(
                models.User.tenant_id == tenant_id,
                models.User.is_active == True
            )
        )
    )
    users = result.scalars().all()
    
    for user in users:
        notification = models.Notification(
            user_id=user.id,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data
        )
        db.add(notification)
        
        await manager.send_personal_message(
            {
                "type": notification_type.value,
                "title": title,
                "message": message,
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            },
            user.id
        )
    
    await db.commit()
