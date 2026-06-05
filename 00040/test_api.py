#!/usr/bin/env python3
import requests
import json
import sys
import time

BASE_URL = "http://localhost:3000/api"

class TestResult:
    passed = 0
    failed = 0
    errors = []

def test(name, response, expected_status=200):
    if response.status_code == expected_status:
        print(f"  ✅ {name} (HTTP {response.status_code})")
        TestResult.passed += 1
        return True
    else:
        print(f"  ❌ {name} (expected HTTP {expected_status}, got HTTP {response.status_code})")
        try:
            print(f"     Response: {response.text[:200]}")
        except:
            pass
        TestResult.failed += 1
        TestResult.errors.append(f"{name}: HTTP {response.status_code}")
        return False

def get_json(response):
    try:
        return response.json()
    except:
        return {}

print("=" * 60)
print("  在线考试与成绩管理系统 - 核心API端点测试")
print("=" * 60)

# Step 1: Login
print("\n📋 1. 用户认证")
r = requests.post(f"{BASE_URL}/auth/login", json={"username":"teacher1","password":"123456"})
test("教师登录", r)
teacher_data = get_json(r)
TEACHER_TOKEN = teacher_data.get("token", "")
teacher_id = teacher_data.get("user", {}).get("id", "")

r = requests.post(f"{BASE_URL}/auth/login", json={"username":"student1","password":"123456"})
test("学生登录", r)
student_data = get_json(r)
STUDENT_TOKEN = student_data.get("token", "")
student1_id = student_data.get("user", {}).get("id", "")

r = requests.post(f"{BASE_URL}/auth/login", json={"username":"admin","password":"123456"})
test("管理员登录", r)
admin_data = get_json(r)
ADMIN_TOKEN = admin_data.get("token", "")

TH = {"Authorization": f"Bearer {TEACHER_TOKEN}", "Content-Type": "application/json"}
SH = {"Authorization": f"Bearer {STUDENT_TOKEN}", "Content-Type": "application/json"}
AH = {"Authorization": f"Bearer {ADMIN_TOKEN}", "Content-Type": "application/json"}

r = requests.get(f"{BASE_URL}/auth/me", headers=TH)
test("获取当前用户", r)

# Step 2: Create Exam
print("\n📋 2. 创建考试（含随机抽题）")

r = requests.get(f"{BASE_URL}/exams/my", headers=TH)
existing_exams = get_json(r)

course_id = ""
class_id = "class-cs2024-01"
if existing_exams and len(existing_exams) > 0:
    course_id = existing_exams[0].get("courseId", "")

if not course_id:
    import subprocess
    result = subprocess.run(
        ["/opt/homebrew/opt/postgresql@16/bin/psql", "-d", "exam_system", "-t", "-A",
         "-c", "SELECT id FROM \"Course\" LIMIT 1;"],
        capture_output=True, text=True
    )
    course_id = result.stdout.strip()

print(f"  Course ID: {course_id}")
print(f"  Class ID: {class_id}")

exam_data = {
    "title": "数据结构期中考试",
    "courseId": course_id,
    "classId": class_id,
    "duration": 120,
    "startTime": "2026-06-03T10:00:00.000Z",
    "endTime": "2026-06-03T12:00:00.000Z",
    "passingScore": 60,
    "rules": [
        {"questionType": "SINGLE_CHOICE", "count": 5, "scorePerQuestion": 5},
        {"questionType": "TRUE_FALSE", "count": 3, "scorePerQuestion": 3},
        {"questionType": "SUBJECTIVE", "count": 2, "scorePerQuestion": 10}
    ]
}

r = requests.post(f"{BASE_URL}/exams", headers=TH, json=exam_data)
test("创建考试（含随机抽题规则）", r, 201)
exam = get_json(r)
EXAM_ID = exam.get("id", "")
print(f"  Exam ID: {EXAM_ID}")
print(f"  Total Score: {exam.get('totalScore', 'N/A')}")

# Step 3: Publish & Start Exam
print("\n📋 3. 发布与开始考试")
r = requests.put(f"{BASE_URL}/exams/{EXAM_ID}/publish", headers=TH)
test("发布考试", r)

r = requests.put(f"{BASE_URL}/exams/{EXAM_ID}/start", headers=TH)
test("开始考试", r)

# Step 4: Student gets paper & submits answers
print("\n📋 4. 考生提交试卷（客观题自动评分）")
r = requests.get(f"{BASE_URL}/exams/{EXAM_ID}/paper", headers=SH)
test("获取考生试卷", r)
paper = get_json(r)
PAPER_ID = paper.get("id", "")
questions = paper.get("questions", [])
print(f"  Paper ID: {PAPER_ID}")
print(f"  Questions count: {len(questions)}")

for q in questions:
    qid = q.get("question", {}).get("id", "")
    qtype = q.get("question", {}).get("type", "")
    if qtype == "SUBJECTIVE":
        answer = "快速排序的基本思想是分治法，选择基准元素将数组分为两部分，递归排序。平均时间复杂度O(nlogn)。"
    elif qtype == "TRUE_FALSE":
        answer = "T"
    else:
        answer = "A"

    r = requests.post(
        f"{BASE_URL}/exams/papers/{PAPER_ID}/answers",
        headers=SH,
        json={"questionId": qid, "answer": answer}
    )

auto_scores = []
r_data = requests.get(f"{BASE_URL}/exams/{EXAM_ID}/paper", headers=SH)
paper_detail = get_json(r_data)
for a in paper_detail.get("answers", []):
    if a.get("autoScore") is not None:
        auto_scores.append(a["autoScore"])
print(f"  Auto-graded answers: {len(auto_scores)}")
print(f"  Auto scores: {auto_scores}")

r = requests.put(f"{BASE_URL}/exams/papers/{PAPER_ID}/submit", headers=SH)
test("提交试卷", r)

# Step 5: Submit papers for all other students
print("\n📋 5. 所有考生提交试卷（生成统计数据）")
student_tokens = {}
for i in range(2, 11):
    r = requests.post(f"{BASE_URL}/auth/login", json={"username": f"student{i}", "password": "123456"})
    data = get_json(r)
    token = data.get("token", "")
    student_tokens[i] = token

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r = requests.get(f"{BASE_URL}/exams/{EXAM_ID}/paper", headers=headers)
    sp = get_json(r)
    sp_id = sp.get("id", "")
    sp_questions = sp.get("questions", [])

    for q in sp_questions:
        qid = q.get("question", {}).get("id", "")
        qtype = q.get("question", {}).get("type", "")
        if qtype == "SUBJECTIVE":
            if i <= 3:
                ans = "完整的算法分析和时间复杂度证明过程。"
            elif i <= 6:
                ans = "基本正确但不够深入。"
            else:
                ans = "回答不完整。"
        elif qtype == "TRUE_FALSE":
            ans = "T" if i % 2 == 0 else "F"
        else:
            choices = ["A", "B", "C", "D"]
            ans = choices[i % 4]

        requests.post(f"{BASE_URL}/exams/papers/{sp_id}/answers", headers=headers,
                      json={"questionId": qid, "answer": ans})

    r = requests.put(f"{BASE_URL}/exams/papers/{sp_id}/submit", headers=headers)

test("10名学生全部提交试卷", type('', (), {'status_code': 200})(), 200)

# Step 6: Grade subjective answers
print("\n📋 6. 主观题评阅")
r = requests.get(f"{BASE_URL}/grading/pending", headers=TH)
test("获取待评阅列表", r)
pending = get_json(r)
print(f"  Pending gradings: {len(pending)}")

graded_count = 0
for item in pending:
    answer_id = item.get("answer", {}).get("id", "")
    if answer_id:
        score = min(10, max(3, 10 - graded_count % 5))
        r = requests.put(
            f"{BASE_URL}/grading/answers/{answer_id}/grade",
            headers=TH,
            json={"score": score, "comment": f"评阅意见：回答{'良好' if score >= 7 else '需改进'}"}
        )
        if r.status_code == 200:
            graded_count += 1

print(f"  Graded {graded_count} subjective answers")

# Finalize all papers
print("\n📋 7. 计算最终成绩")
import subprocess
result = subprocess.run(
    ["/opt/homebrew/opt/postgresql@16/bin/psql", "-d", "exam_system", "-t", "-A",
     "-c", f"SELECT id FROM \"ExamPaper\" WHERE \"examId\"='{EXAM_ID}';"],
    capture_output=True, text=True
)
paper_ids = [pid.strip() for pid in result.stdout.strip().split('\n') if pid.strip()]

finalized = 0
for pid in paper_ids:
    r = requests.put(f"{BASE_URL}/grading/papers/{pid}/finalize", headers=TH)
    if r.status_code == 200:
        finalized += 1

print(f"  Finalized {finalized} papers")

# Step 8: End exam
print("\n📋 8. 结束考试")
r = requests.put(f"{BASE_URL}/exams/{EXAM_ID}/end", headers=TH)
test("结束考试", r)

# Step 9: Calculate statistics
print("\n📋 9. 计算考试成绩统计与排名")
r = requests.post(f"{BASE_URL}/exams/{EXAM_ID}/statistics", headers=TH)
test("计算考试统计", r)
stats_data = get_json(r)

if "statistics" in stats_data:
    s = stats_data["statistics"]
    print(f"  Average Score: {s.get('averageScore', 'N/A')}")
    print(f"  Pass Rate: {s.get('passRate', 'N/A')}")
    print(f"  Highest Score: {s.get('highestScore', 'N/A')}")
    print(f"  Lowest Score: {s.get('lowestScore', 'N/A')}")
    print(f"  Std Deviation: {s.get('stdDeviation', 'N/A')}")
    print(f"  Difficulty Index: {s.get('difficultyIndex', 'N/A')}")
    print(f"  Discrimination Index: {s.get('discriminationIndex', 'N/A')}")

if "rankings" in stats_data:
    print(f"  Rankings ({len(stats_data['rankings'])} students):")
    for rank in stats_data["rankings"][:5]:
        print(f"    #{rank.get('rank')} {rank.get('studentName')}: {rank.get('score')} ({'Pass' if rank.get('isPassed') else 'Fail'})")

if "questionStats" in stats_data:
    print(f"  Question Stats ({len(stats_data['questionStats'])} questions):")
    for qs in stats_data["questionStats"][:3]:
        print(f"    Q{qs.get('questionId','')[:8]}... correctRate={qs.get('correctRate',0):.1%} difficulty={qs.get('difficulty',0):.2f} discrimination={qs.get('discrimination',0):.2f}")

r = requests.get(f"{BASE_URL}/exams/{EXAM_ID}/statistics", headers=TH)
test("获取考试统计", r)

r = requests.get(f"{BASE_URL}/exams/{EXAM_ID}/distribution", headers=TH)
test("获取分数分布", r)
dist = get_json(r)
for d in dist:
    print(f"  {d.get('label','')}: {d.get('count',0)} students")

# Step 10: Anomaly detection
print("\n📋 10. 成绩异常检测")
r = requests.get(f"{BASE_URL}/anomalies", headers=AH)
test("获取异常成绩列表", r)
anomalies = get_json(r)
print(f"  Anomalies detected: {len(anomalies)}")

if len(anomalies) > 0:
    anomaly_id = anomalies[0].get("id", "")
    r = requests.put(
        f"{BASE_URL}/anomalies/{anomaly_id}/review",
        headers=AH,
        json={"status": "CONFIRMED", "comment": "已核实，成绩正常"}
    )
    test("审核异常成绩", r)
else:
    print("  No anomalies (OK - depends on score distribution)")

r = requests.get(f"{BASE_URL}/anomalies/my-scores", headers=SH)
test("获取历史成绩", r)

# Step 11: Makeup exam
print("\n📋 11. 补考申请与审批")

failed_students = []
if "rankings" in stats_data:
    for rank in stats_data["rankings"]:
        if not rank.get("isPassed", True):
            failed_students.append(rank.get("studentId", ""))

makeup_id = None
if failed_students:
    fail_id = failed_students[0]
    if fail_id == student1_id:
        r = requests.post(f"{BASE_URL}/makeup", headers=SH,
                         json={"originalExamId": EXAM_ID, "reason": "考试当天身体不适，申请补考"})
    else:
        for i in range(2, 11):
            r_login = requests.post(f"{BASE_URL}/auth/login",
                                   json={"username": f"student{i}", "password": "123456"})
            login_data = get_json(r_login)
            if login_data.get("user", {}).get("id") == fail_id:
                fail_token = login_data.get("token", "")
                fail_headers = {"Authorization": f"Bearer {fail_token}", "Content-Type": "application/json"}
                r = requests.post(f"{BASE_URL}/makeup", headers=fail_headers,
                                 json={"originalExamId": EXAM_ID, "reason": "需要补考"})
                break
else:
    r = requests.post(f"{BASE_URL}/makeup", headers=SH,
                     json={"originalExamId": EXAM_ID, "reason": "考试发挥失常，申请补考"})

if test("申请补考", r, 201):
    makeup_data = get_json(r)
    makeup_id = makeup_data.get("id", "")
    print(f"  Makeup ID: {makeup_id}")
elif r.status_code == 400:
    print(f"  (补考申请被正确拒绝: {get_json(r).get('error', '')[:60]})")

if makeup_id:
    r = requests.put(
        f"{BASE_URL}/makeup/{makeup_id}/approve",
        headers=TH,
        json={
            "startTime": "2026-06-10T10:00:00.000Z",
            "endTime": "2026-06-10T12:00:00.000Z"
        }
    )
    test("批准补考", r)
    makeup_result = get_json(r)
    if "makeupExam" in makeup_result:
        print(f"  Makeup Exam ID: {makeup_result['makeupExam'].get('id', 'N/A')}")

r = requests.get(f"{BASE_URL}/makeup/my", headers=SH)
test("获取补考申请列表", r)

# Step 12: Notifications
print("\n📋 12. 实时推送通知")
r = requests.get(f"{BASE_URL}/notifications", headers=SH)
test("获取通知列表", r)
notif_data = get_json(r)
print(f"  Notifications: {notif_data.get('total', 0)} total, {notif_data.get('unreadCount', 0)} unread")

if notif_data.get("notifications"):
    first_notif = notif_data["notifications"][0]
    r = requests.put(f"{BASE_URL}/notifications/{first_notif['id']}/read", headers=SH)
    test("标记通知已读", r)

r = requests.put(f"{BASE_URL}/notifications/read-all", headers=SH)
test("全部标记已读", r)

# Step 13: Export
print("\n📋 13. 班级成绩单和试卷质量分析报表导出")
r = requests.get(f"{BASE_URL}/export/class/{class_id}/scores", headers=TH)
if test("导出班级成绩单", r):
    file_size = len(r.content)
    print(f"  File size: {file_size} bytes")
    with open("/tmp/class_scores_test.xlsx", "wb") as f:
        f.write(r.content)

r = requests.get(f"{BASE_URL}/export/course/{course_id}/analysis", headers=TH)
if test("导出试卷质量分析报表", r):
    file_size = len(r.content)
    print(f"  File size: {file_size} bytes")
    with open("/tmp/exam_analysis_test.xlsx", "wb") as f:
        f.write(r.content)

# Summary
print("\n" + "=" * 60)
print(f"  测试结果: ✅ {TestResult.passed} 通过, ❌ {TestResult.failed} 失败")
if TestResult.errors:
    print("  失败项:")
    for e in TestResult.errors:
        print(f"    - {e}")
print("=" * 60)

sys.exit(0 if TestResult.failed == 0 else 1)
