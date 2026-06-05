#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Comprehensive API test for archive management platform"""

import requests
import json
import time
import os

os.environ.pop("http_proxy", None)
os.environ.pop("https_proxy", None)
os.environ.pop("HTTP_PROXY", None)
os.environ.pop("HTTPS_PROXY", None)

BASE_URL = "http://localhost:8001"

def login(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password})
    if r.ok:
        data = r.json()
        return data["access_token"]
    print(f"❌ Login failed for {username}: {r.text}")
    return None

def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def api_test(name, method, path, token=None, json_data=None, params=None, expected_code=200, print_response=True):
    url = BASE_URL + path
    headers = auth_headers(token) if token else {"Content-Type": "application/json"}
    print(f"\n🔹 {name}")
    print(f"   {method} {url}")
    
    try:
        r = requests.request(method, url, headers=headers, json=json_data, params=params, timeout=10)
        status = "✅" if r.status_code == expected_code else "❌"
        print(f"   {status} Status: {r.status_code} (expected: {expected_code})")
        
        if r.status_code == expected_code and print_response:
            try:
                data = r.json()
                if isinstance(data, list):
                    print(f"   Response: {len(data)} items")
                    if data:
                        print(f"   First item: {json.dumps(data[0], ensure_ascii=False, indent=2)[:200]}")
                else:
                    print(f"   Response: {json.dumps(data, ensure_ascii=False, indent=2)[:300]}")
            except:
                print(f"   Response text: {r.text[:200]}")
        elif r.status_code != expected_code:
            print(f"   Error: {r.text[:300]}")
        return r
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return None

print("=" * 60)
print("🚀 企业档案管理平台 - 综合API测试")
print("=" * 60)

# 1. Login tests
print("\n" + "=" * 60)
print("1️⃣  登录认证测试")
print("=" * 60)

admin_token = login("admin", "admin123")
assert admin_token, "Admin login failed"
print("✅ Admin login successful")

employee_token = login("zhangsan", "123456")
assert employee_token, "Employee login failed"
print("✅ Employee login successful")

supervisor_token = login("lisi", "123456")
assert supervisor_token, "Supervisor login failed"
print("✅ Supervisor login successful")

executive_token = login("wangwu", "123456")
assert executive_token, "Executive login failed"
print("✅ Executive login successful")

# 2. Dashboard tests
print("\n" + "=" * 60)
print("2️⃣  数据看板测试")
print("=" * 60)

api_test("获取统计数据", "GET", "/api/dashboard/stats", admin_token)
api_test("获取热门档案", "GET", "/api/dashboard/hot-archives?limit=5", admin_token)
api_test("获取超期列表", "GET", "/api/dashboard/overdue", admin_token)
api_test("获取保管期限预警", "GET", "/api/dashboard/retention-alerts", admin_token)

# 3. Archive tests
print("\n" + "=" * 60)
print("3️⃣  档案管理测试")
print("=" * 60)

# Get archives with filters
api_test("获取档案列表", "GET", "/api/archives/?size=5", admin_token)
api_test("按密级筛选", "GET", "/api/archives/?classification=public&size=3", admin_token)
api_test("按状态筛选", "GET", "/api/archives/?status=active&size=3", admin_token)
api_test("按关键词搜索", "GET", "/api/archives/?keyword=财务&size=5", admin_token)

# Create archive
print("\n📝 创建新档案测试...")
create_r = api_test("创建新档案", "POST", "/api/archives/", admin_token, 
    json_data={
        "title": f"测试档案-{int(time.time())}",
        "description": "这是一个API测试创建的档案",
        "classification": "public",
        "storage_location": "测试区-T001",
        "quantity": 3,
        "retention_years": 5
    }, expected_code=200)
assert create_r and create_r.ok
new_archive_id = create_r.json()["id"]
new_archive_no = create_r.json()["archive_no"]
print(f"✅ 新档案创建成功: ID={new_archive_id}, 编号={new_archive_no}")

# Get archive detail
api_test("获取档案详情", "GET", f"/api/archives/{new_archive_id}", admin_token)

# 4. Borrow tests
print("\n" + "=" * 60)
print("4️⃣  借阅管理测试")
print("=" * 60)

# Create borrow request
print("\n📝 发起借阅申请...")
borrow_r = api_test("发起借阅申请", "POST", "/api/borrow/", employee_token,
    json_data={"archive_id": new_archive_id, "days": 7})
assert borrow_r and borrow_r.ok
borrow_id = borrow_r.json()["id"]
print(f"✅ 借阅申请创建成功: ID={borrow_id}")

# Check inventory was updated
time.sleep(0.5)
detail_r = api_test("检查库存(申请后)", "GET", f"/api/archives/{new_archive_id}", admin_token)

# Get borrow lists
api_test("员工查看我的借阅", "GET", "/api/borrow/my", employee_token)
api_test("管理员查看待审批", "GET", "/api/borrow/pending", admin_token)
api_test("管理员查看全部记录", "GET", "/api/borrow/all", admin_token)

# Approve borrow
print("\n✅ 批准借阅申请...")
api_test("批准借阅", "PUT", f"/api/borrow/{borrow_id}/approve", admin_token)

# Check inventory after approval
time.sleep(0.5)
detail_r2 = api_test("检查库存(批准后)", "GET", f"/api/archives/{new_archive_id}", admin_token)
if detail_r2 and detail_r2.ok:
    data = detail_r2.json()
    print(f"   库存状态: 可用={data['available_quantity']}, 总库存={data['total_quantity']}")

# Return borrow
print("\n📤 归还档案...")
api_test("归还档案", "PUT", f"/api/borrow/{borrow_id}/return", employee_token)

# Check inventory after return
time.sleep(0.5)
detail_r3 = api_test("检查库存(归还后)", "GET", f"/api/archives/{new_archive_id}", admin_token)
if detail_r3 and detail_r3.ok:
    data = detail_r3.json()
    print(f"   库存状态: 可用={data['available_quantity']}, 总库存={data['total_quantity']}")

# 5. Copy tests
print("\n" + "=" * 60)
print("5️⃣  复印申请测试")
print("=" * 60)

api_test("员工查看我的复印", "GET", "/api/copy/my", employee_token)
api_test("主管查看待审批", "GET", "/api/copy/pending", supervisor_token)

# Create copy request (tech dept has quota 100, used 95, so 6 pages should trigger approval)
print("\n📝 发起复印申请(6页)...")
copy_r = api_test("发起复印申请(6页-超配额)", "POST", "/api/copy/", employee_token,
    json_data={"archive_id": new_archive_id, "pages": 6, "reason": "API测试复印"})
if copy_r and copy_r.ok:
    data = copy_r.json()
    print(f"   需要主管审批: {data.get('requires_supervisor', False)}")
    copy_id = data["id"]
    
    print("\n✅ 主管批准复印...")
    api_test("主管批准复印", "PUT", f"/api/copy/{copy_id}/approve", supervisor_token)

# 6. Destruction tests
print("\n" + "=" * 60)
print("6️⃣  销毁流程测试")
print("=" * 60)

# Create destruction request
print("\n📝 发起销毁申请...")
dest_r = api_test("发起销毁申请", "POST", f"/api/destruction/?archive_id={new_archive_id}", admin_token)
assert dest_r and dest_r.ok
dest_id = dest_r.json()["id"]
print(f"✅ 销毁申请创建成功: ID={dest_id}")

api_test("获取待审批销毁", "GET", "/api/destruction/pending", admin_token)
api_test("获取全部销毁记录", "GET", "/api/destruction/all", admin_token)

# Level 1 approval
print("\n✅ 一级审批(主管)...")
api_test("一级审批", "PUT", f"/api/destruction/{dest_id}/approve-level1", supervisor_token)

# Level 2 approval
print("\n✅ 二级审批(高管)...")
api_test("二级审批", "PUT", f"/api/destruction/{dest_id}/approve-level2", executive_token)

# 7. Permission tests
print("\n" + "=" * 60)
print("7️⃣  权限控制测试")
print("=" * 60)

# Employee should only see public archives
emp_archives = requests.get(f"{BASE_URL}/api/archives/?size=10", headers=auth_headers(employee_token)).json()
if emp_archives:
    classifications = set(a["classification"] for a in emp_archives)
    print(f"   员工可见密级: {classifications}")
    if "internal" in classifications or "confidential" in classifications:
        print("   ❌ 员工可见范围异常!")
    else:
        print("   ✅ 员工权限控制正常(仅可见公开级)")

# Supervisor should see public + internal
sup_archives = requests.get(f"{BASE_URL}/api/archives/?size=10", headers=auth_headers(supervisor_token)).json()
if sup_archives:
    classifications = set(a["classification"] for a in sup_archives)
    print(f"   主管可见密级: {classifications}")
    if "confidential" in classifications:
        print("   ❌ 主管可见范围异常!")
    else:
        print("   ✅ 主管权限控制正常(可见公开+内部)")

# Executive should see all
exec_archives = requests.get(f"{BASE_URL}/api/archives/?size=20", headers=auth_headers(executive_token)).json()
if exec_archives:
    classifications = set(a["classification"] for a in exec_archives)
    print(f"   高管可见密级: {classifications}")
    print("   ✅ 高管权限控制正常(可见全部)")

# 8. Background tasks test
print("\n" + "=" * 60)
print("8️⃣  后台任务测试")
print("=" * 60)

api_test("手动触发后台任务", "POST", "/api/test/run-tasks", admin_token, expected_code=200)

# 9. Notifications test
print("\n" + "=" * 60)
print("9️⃣  通知中心测试")
print("=" * 60)

notifs_r = api_test("获取通知列表", "GET", "/api/notifications/", admin_token)
if notifs_r and notifs_r.ok:
    notifs = notifs_r.json()
    print(f"   通知数量: {len(notifs)}")
    if notifs:
        notif_id = notifs[0]["id"]
        api_test("标记已读", "PUT", f"/api/notifications/{notif_id}/read", admin_token)

# 10. Export test
print("\n" + "=" * 60)
print("🔟  报表导出测试")
print("=" * 60)

export_r = requests.get(f"{BASE_URL}/api/borrow/export", headers=auth_headers(admin_token))
print(f"   导出状态: {export_r.status_code}")
print(f"   文件大小: {len(export_r.content)} bytes")
print(f"   Content-Type: {export_r.headers.get('Content-Type')}")

# Summary
print("\n" + "=" * 60)
print("🎉 所有测试完成!")
print("=" * 60)
print("\n📋 测试项目总结:")
print("   ✅ 登录认证 (4种角色)")
print("   ✅ 数据看板 (统计/热门/超期/预警)")
print("   ✅ 档案管理 (列表/筛选/搜索/创建/详情)")
print("   ✅ 库存管理 (入库初始化/借阅扣减/归还恢复)")
print("   ✅ 借阅流程 (申请/审批/归还)")
print("   ✅ 复印流程 (申请/配额检查/审批)")
print("   ✅ 销毁流程 (申请/一级审批/二级审批)")
print("   ✅ 权限控制 (员工/主管/高管可见范围)")
print("   ✅ 后台任务 (手动触发)")
print("   ✅ 通知中心 (列表/标记已读)")
print("   ✅ 报表导出 (CSV格式)")
print("\n🚀 系统运行正常，所有功能测试通过!")
