import sys
import os
import random
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta
from app.database import engine, SessionLocal, Base
from app.models import User, Department, Archive, BorrowRequest, CopyRequest, Notification, ArchiveStatusEnum, BorrowStatusEnum
from app.auth import get_password_hash

Base.metadata.create_all(bind=engine)

db = SessionLocal()

if db.query(User).count() > 0:
    print("数据已存在，跳过初始化")
    db.close()
    exit()

dept_tech = Department(name="技术研发部", monthly_copy_quota=100, used_copy_quota=95, quota_year=2026, quota_month=6)
dept_hr = Department(name="人力资源部", monthly_copy_quota=80, used_copy_quota=30, quota_year=2026, quota_month=6)
dept_finance = Department(name="财务部", monthly_copy_quota=60, used_copy_quota=58, quota_year=2026, quota_month=6)
dept_legal = Department(name="法务部", monthly_copy_quota=50, used_copy_quota=10, quota_year=2026, quota_month=6)
db.add_all([dept_tech, dept_hr, dept_finance, dept_legal])
db.commit()

users = [
    User(username="admin", hashed_password=get_password_hash("admin123"), real_name="系统管理员", role="admin", department_id=dept_tech.id),
    User(username="zhangsan", hashed_password=get_password_hash("123456"), real_name="张三", role="employee", department_id=dept_tech.id),
    User(username="lisi", hashed_password=get_password_hash("123456"), real_name="李四", role="supervisor", department_id=dept_hr.id),
    User(username="wangwu", hashed_password=get_password_hash("123456"), real_name="王五", role="executive", department_id=dept_finance.id),
    User(username="zhaoliu", hashed_password=get_password_hash("123456"), real_name="赵六", role="employee", department_id=dept_legal.id),
    User(username="sunqi", hashed_password=get_password_hash("123456"), real_name="孙七", role="employee", department_id=dept_tech.id, violation_count=2),
    User(username="zhouba", hashed_password=get_password_hash("123456"), real_name="周八", role="supervisor", department_id=dept_tech.id),
]
db.add_all(users)
db.commit()

classifications = ["public", "internal", "confidential"]
locations = ["A区1排1柜", "A区2排3柜", "B区1排2柜", "B区3排1柜", "C区1排1柜", "C区2排4柜", "A区1排2柜", "B区2排1柜", "A区3排1柜", "B区1排3柜", "C区1排2柜", "C区2排2柜", "A区1排3柜", "A区2排1柜", "B区3排3柜", "C区1排3柜", "A区3排2柜", "B区2排3柜", "C区2排1柜", "A区1排4柜"]
archive_data = [
    ("2023年度财务审计报告", "internal", 10),
    ("员工培训管理制度", "public", 5),
    ("核心技术架构设计文档", "confidential", 15),
    ("年度经营计划书", "internal", 10),
    ("公司章程及修订记录", "public", 30),
    ("客户数据安全策略", "confidential", 10),
    ("部门绩效考核方案", "internal", 5),
    ("新产品研发可行性报告", "confidential", 10),
    ("供应商合作协议汇编", "public", 5),
    ("知识产权登记档案", "internal", 15),
    ("安全生产管理制度", "public", 5),
    ("商业秘密保护协议", "confidential", 10),
    ("季度财务报表合集", "internal", 10),
    ("员工手册", "public", 3),
    ("战略并购评估报告", "confidential", 20),
    ("行政管理制度汇编", "public", 5),
    ("项目验收文档", "internal", 7),
    ("技术专利清单", "confidential", 15),
    ("企业社会责任报告", "public", 5),
    ("投资决策会议纪要", "internal", 10),
]

now = datetime.utcnow()
archives = []
for i, (title, cls, ret_years) in enumerate(archive_data):
    month = (i % 12) + 1
    entry = now.replace(month=month, day=1) - timedelta(days=30 * (12 - month))
    
    if i < 3:
        ret_years = 0
        ret_end = now + timedelta(days=random.randint(1, 25))
    else:
        ret_end = entry + timedelta(days=ret_years * 365) if ret_years else None
    
    total_qty = random.randint(1, 10)
    borrow_qty = 0
    if i < 3:
        borrow_qty = random.randint(0, max(0, total_qty - 1))
    
    a = Archive(
        archive_no=f"ARC{entry.strftime('%Y%m')}{i+1:04d}",
        title=title,
        description=f"{title}的详细描述，包含档案的主要内容和用途说明。",
        classification=cls,
        storage_location=locations[i % len(locations)],
        retention_years=ret_years,
        entry_date=entry,
        retention_end_date=ret_end,
        created_by=1,
        borrow_count=max(0, 25 - i * 2) if cls == "public" else max(0, 18 - i * 2),
        total_quantity=total_qty,
        available_quantity=total_qty - borrow_qty,
    )
    archives.append(a)
db.add_all(archives)
db.commit()

borrows = [
    BorrowRequest(archive_id=1, borrower_id=2, status="approved", request_date=now - timedelta(days=5), approved_by=1, approved_date=now - timedelta(days=5), due_date=now + timedelta(days=2)),
    BorrowRequest(archive_id=4, borrower_id=5, status="approved", request_date=now - timedelta(days=10), approved_by=1, approved_date=now - timedelta(days=10), due_date=now - timedelta(days=3)),
    BorrowRequest(archive_id=7, borrower_id=6, status="approved", request_date=now - timedelta(days=8), approved_by=3, approved_date=now - timedelta(days=8), due_date=now - timedelta(days=1)),
    BorrowRequest(archive_id=2, borrower_id=7, status="pending", request_date=now - timedelta(hours=25), is_escalated=True),
    BorrowRequest(archive_id=9, borrower_id=2, status="pending", request_date=now - timedelta(hours=5)),
    BorrowRequest(archive_id=5, borrower_id=2, status="returned", request_date=now - timedelta(days=20), approved_by=3, approved_date=now - timedelta(days=20), due_date=now - timedelta(days=13), return_date=now - timedelta(days=14)),
]
db.add_all(borrows)
db.commit()

copies = [
    CopyRequest(archive_id=5, requester_id=2, pages=5, reason="新员工培训使用", status="approved", approved_by=1, approved_date=now - timedelta(days=3)),
    CopyRequest(archive_id=6, requester_id=5, pages=10, reason="合同审查参考", status="pending", requires_supervisor=True),
]
db.add_all(copies)
db.commit()

notifications = [
    Notification(user_id=1, type="borrow_request", message="周八申请借阅档案[ARC2025040002]员工培训管理制度", related_id=4),
    Notification(user_id=1, type="borrow_request", message="张三申请借阅档案[ARC2025080009]供应商合作协议汇编", related_id=5),
    Notification(user_id=3, type="copy_over_quota", message="赵六复印申请超出部门月度配额，需审批", related_id=2),
    Notification(user_id=4, type="borrow_escalation", message="借阅申请超24小时未处理（升级）：周八申请[ARC2025040002]员工培训管理制度", related_id=4),
    Notification(user_id=2, type="return_reminder", message="您借阅的档案[ARC2026010001]2023年度财务审计报告即将到期，请及时归还"),
]
db.add_all(notifications)
db.commit()

print("=" * 60)
print("演示数据初始化完成！")
print("=" * 60)
print("演示账号：")
print("  管理员:  admin / admin123   (全部权限)")
print("  普通员工: zhangsan / 123456 (仅公开级, 技术部)")
print("  普通员工: zhaoliu / 123456  (仅公开级, 法务部, 有超期)")
print("  普通员工: sunqi / 123456   (仅公开级, 技术部, 已有2次违规)")
print("  主管:    lisi / 123456     (公开+内部级, 人事部)")
print("  主管:    zhouba / 123456   (公开+内部级, 技术部, 有待审批)")
print("  高管:    wangwu / 123456   (全部密级)")
print("=" * 60)
print("预置演示场景：")
print("  - 3笔借阅进行中（2笔超期、1笔2天后到期）")
print("  - 2笔待审批借阅（1笔已超24小时自动升级）")
print("  - 1笔超配额复印待主管审批")
print("  - 技术部配额已用95/100，财务部已用58/60")
print("  - 3份档案保管期限即将到期（30天内）")
print("  - 孙七已有2次违规，再超期一次将冻结30天")
print("=" * 60)
db.close()
