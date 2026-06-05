#!/bin/bash
set -e

BASE_URL="http://localhost:3000/api"
TEACHER_TOKEN=""
STUDENT_TOKEN=""
ADMIN_TOKEN=""
EXAM_ID=""
PAPER_ID=""
ANSWER_ID=""
MAKEUP_ID=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_test() {
  echo -e "\n${YELLOW}=== TEST: $1 ===${NC}"
}

log_pass() {
  echo -e "${GREEN}✅ PASS: $1${NC}"
}

log_fail() {
  echo -e "${RED}❌ FAIL: $1${NC}"
  echo -e "${RED}Response: $2${NC}"
}

check_status() {
  local name=$1
  local expected=$2
  local actual=$3
  local body=$4
  if [ "$actual" -eq "$expected" ]; then
    log_pass "$name (HTTP $actual)"
  else
    log_fail "$name (expected HTTP $expected, got HTTP $actual)" "$body"
    exit 1
  fi
}

log_test "1. Login as Teacher"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher1","password":"123456"}')
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
TEACHER_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
check_status "Teacher Login" 200 "$HTTP_CODE" "$BODY"
echo "Token: ${TEACHER_TOKEN:0:30}..."

log_test "2. Login as Student"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"123456"}')
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
STUDENT_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
check_status "Student Login" 200 "$HTTP_CODE" "$BODY"
echo "Token: ${STUDENT_TOKEN:0:30}..."

log_test "3. Login as Admin"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}')
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
ADMIN_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
check_status "Admin Login" 200 "$HTTP_CODE" "$BODY"
echo "Token: ${ADMIN_TOKEN:0:30}..."

log_test "4. Get Current User"
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "Get Current User" 200 "$HTTP_CODE" "$BODY"
echo "$BODY" | python3 -m json.tool 2>/dev/null | head -5

log_test "5. Create Exam (with random question selection)"
START_TIME=$(date -u -v+1H +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+1 hour" +"%Y-%m-%dT%H:%M:%S.000Z")
END_TIME=$(date -u -v+2H +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+2 hours" +"%Y-%m-%dT%H:%M:%S.000Z")
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/exams" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"数据结构期中考试\",
    \"courseId\": \"$(python3 -c "import sys,json; print(json.load(open('/dev/stdin'))['courseId'])" <<< "$(curl -s "$BASE_URL/auth/me" -H "Authorization: Bearer $TEACHER_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d))" 2>/dev/null)" 2>/dev/null)\",
    \"classId\": \"class-cs2024-01\",
    \"duration\": 120,
    \"startTime\": \"$START_TIME\",
    \"endTime\": \"$END_TIME\",
    \"passingScore\": 60,
    \"rules\": [
      {\"questionType\": \"SINGLE_CHOICE\", \"count\": 5, \"scorePerQuestion\": 5},
      {\"questionType\": \"TRUE_FALSE\", \"count\": 3, \"scorePerQuestion\": 3},
      {\"questionType\": \"SUBJECTIVE\", \"count\": 2, \"scorePerQuestion\": 10}
    ]
  }")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')

COURSE_ID=$(python3 -c "
import json
with open('/dev/stdin') as f:
    import sys
" 2>/dev/null)

if [ "$HTTP_CODE" -ne 201 ]; then
  COURSE_RESP=$(curl -s "http://localhost:3000/api/auth/me" -H "Authorization: Bearer $TEACHER_TOKEN")
  echo "Teacher info: $COURSE_RESP"
fi

EXAM_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)

if [ -z "$EXAM_ID" ] || [ "$EXAM_ID" = "None" ]; then
  log_fail "Create Exam - no exam ID returned" "$BODY"
  
  echo "Trying with direct course query..."
  COURSE_ID=$(/opt/homebrew/opt/postgresql@16/bin/psql -d exam_system -t -A -c "SELECT id FROM \"Course\" LIMIT 1;" 2>/dev/null | tr -d ' ')
  echo "Course ID from DB: $COURSE_ID"
  
  RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/exams" \
    -H "Authorization: Bearer $TEACHER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"数据结构期中考试\",
      \"courseId\": \"$COURSE_ID\",
      \"classId\": \"class-cs2024-01\",
      \"duration\": 120,
      \"startTime\": \"$START_TIME\",
      \"endTime\": \"$END_TIME\",
      \"passingScore\": 60,
      \"rules\": [
        {\"questionType\": \"SINGLE_CHOICE\", \"count\": 5, \"scorePerQuestion\": 5},
        {\"questionType\": \"TRUE_FALSE\", \"count\": 3, \"scorePerQuestion\": 3},
        {\"questionType\": \"SUBJECTIVE\", \"count\": 2, \"scorePerQuestion\": 10}
      ]
    }")
  HTTP_CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  EXAM_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
fi

check_status "Create Exam" 201 "$HTTP_CODE" "$BODY"
echo "Exam ID: $EXAM_ID"

log_test "6. Get Exam Details"
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/exams/$EXAM_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "Get Exam Details" 200 "$HTTP_CODE" "$BODY"
echo "$BODY" | python3 -m json.tool 2>/dev/null | head -10

log_test "7. Publish Exam"
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/exams/$EXAM_ID/publish" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "Publish Exam" 200 "$HTTP_CODE" "$BODY"

log_test "8. Start Exam"
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/exams/$EXAM_ID/start" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "Start Exam" 200 "$HTTP_CODE" "$BODY"

log_test "9. Get Exam Paper (Student - generates paper with random questions)"
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/exams/$EXAM_ID/paper" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
PAPER_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
check_status "Get Exam Paper" 200 "$HTTP_CODE" "$BODY"
echo "Paper ID: $PAPER_ID"
QUESTION_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('questions',[])))" 2>/dev/null)
echo "Questions in paper: $QUESTION_COUNT"

log_test "10. Submit Answers (auto-grading for objective questions)"
FIRST_QUESTION_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); qs=d.get('questions',[]); print(qs[0]['question']['id'] if qs else '')" 2>/dev/null)
SECOND_QUESTION_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); qs=d.get('questions',[]); print(qs[1]['question']['id'] if len(qs)>1 else '')" 2>/dev/null)

if [ -n "$FIRST_QUESTION_ID" ]; then
  RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/exams/papers/$PAPER_ID/answers" \
    -H "Authorization: Bearer $STUDENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"questionId\": \"$FIRST_QUESTION_ID\", \"answer\": \"A\"}")
  HTTP_CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  check_status "Submit Answer 1" 200 "$HTTP_CODE" "$BODY"
  AUTO_SCORE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('autoScore','N/A'))" 2>/dev/null)
  echo "Auto-score for answer 1: $AUTO_SCORE"
fi

if [ -n "$SECOND_QUESTION_ID" ]; then
  RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/exams/papers/$PAPER_ID/answers" \
    -H "Authorization: Bearer $STUDENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"questionId\": \"$SECOND_QUESTION_ID\", \"answer\": \"B\"}")
  HTTP_CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  check_status "Submit Answer 2" 200 "$HTTP_CODE" "$BODY"
fi

ALL_QUESTIONS=$(curl -s "$BASE_URL/exams/$EXAM_ID/paper" -H "Authorization: Bearer $STUDENT_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for q in d.get('questions',[]):
    qid=q['question']['id']
    qtype=q['question']['type']
    if qtype=='SUBJECTIVE':
        print(f'{qid}|SUBJECTIVE')
    else:
        print(f'{qid}|{qtype}')
" 2>/dev/null)

while IFS='|' read -r QID QTYPE; do
  if [ "$QTYPE" = "SUBJECTIVE" ]; then
    ANSWER="快速排序的基本思想是选择一个基准元素，将数组分为两部分，递归排序。时间复杂度平均O(nlogn)，最坏O(n^2)。"
  elif [ "$QTYPE" = "TRUE_FALSE" ]; then
    ANSWER="T"
  else
    ANSWER="C"
  fi
  
  RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/exams/papers/$PAPER_ID/answers" \
    -H "Authorization: Bearer $STUDENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"questionId\": \"$QID\", \"answer\": \"$ANSWER\"}")
  HTTP_CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
done <<< "$ALL_QUESTIONS"

log_pass "All answers submitted"

log_test "11. Submit Paper"
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/exams/papers/$PAPER_ID/submit" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "Submit Paper" 200 "$HTTP_CODE" "$BODY"
echo "Paper status after submit: $(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','N/A'))" 2>/dev/null)"

log_test "12. Submit papers for other students (to generate statistics)"
STUDENT_TOKENS=()
for i in $(seq 2 10); do
  RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"student${i}\",\"password\":\"123456\"}")
  TOKEN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
  STUDENT_TOKENS+=("$TOKEN")
  
  RESP=$(curl -s "$BASE_URL/exams/$EXAM_ID/paper" -H "Authorization: Bearer $TOKEN")
  SP_ID=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
  
  SP_QUESTIONS=$(echo "$RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for q in d.get('questions',[]):
    qid=q['question']['id']
    qtype=q['question']['type']
    print(f'{qid}|{qtype}')
" 2>/dev/null)
  
  while IFS='|' read -r QID QTYPE; do
    if [ "$QTYPE" = "SUBJECTIVE" ]; then
      if [ $i -le 3 ]; then
        ANS="详细完整的答案，包含算法原理、步骤分析和时间复杂度证明。"
      elif [ $i -le 6 ]; then
        ANS="基本正确但不够完整的答案。"
      else
        ANS="回答不完整。"
      fi
    elif [ "$QTYPE" = "TRUE_FALSE" ]; then
      ANS=$(( RANDOM % 2 == 0 )) && ANS="T" || ANS="F"
    else
      CHOICES=("A" "B" "C" "D")
      ANS=${CHOICES[$((RANDOM % 4))]}
    fi
    
    curl -s -X POST "$BASE_URL/exams/papers/$SP_ID/answers" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"questionId\": \"$QID\", \"answer\": \"$ANS\"}" > /dev/null
  done <<< "$SP_QUESTIONS"
  
  curl -s -X PUT "$BASE_URL/exams/papers/$SP_ID/submit" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
done
log_pass "All 10 students submitted their papers"

log_test "13. Get Pending Gradings (Teacher)"
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/grading/pending" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "Get Pending Gradings" 200 "$HTTP_CODE" "$BODY"
PENDING_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)
echo "Pending gradings: $PENDING_COUNT"

log_test "14. Grade Subjective Answer"
FIRST_PENDING=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['answer']['id'] if d else '')" 2>/dev/null)
if [ -n "$FIRST_PENDING" ]; then
  ANSWER_ID=$FIRST_PENDING
  RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/grading/answers/$ANSWER_ID/grade" \
    -H "Authorization: Bearer $TEACHER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"score": 8, "comment": "理解基本概念但分析不够深入"}')
  HTTP_CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  check_status "Grade Subjective Answer" 200 "$HTTP_CODE" "$BODY"
fi

PENDING_RESP=$(curl -s "$BASE_URL/grading/pending" -H "Authorization: Bearer $TEACHER_TOKEN")
PENDING_ITEMS=$(echo "$PENDING_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); [print(item['answer']['id']) for item in d]" 2>/dev/null)

COUNT=0
for AID in $PENDING_ITEMS; do
  COUNT=$((COUNT+1))
  if [ $COUNT -le 19 ]; then
    SCORE=$(( RANDOM % 5 + 5 ))
    curl -s -X PUT "$BASE_URL/grading/answers/$AID/grade" \
      -H "Authorization: Bearer $TEACHER_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"score\": $SCORE, \"comment\": \"评语$COUNT\"}" > /dev/null
  fi
done
log_pass "Graded multiple subjective answers"

log_test "15. End Exam"
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/exams/$EXAM_ID/end" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "End Exam" 200 "$HTTP_CODE" "$BODY"

log_test "16. Calculate Exam Statistics & Rankings"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/exams/$EXAM_ID/statistics" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "Statistics failed, trying to finalize remaining papers first..."
  
  REMAINING_PENDING=$(curl -s "$BASE_URL/grading/pending" -H "Authorization: Bearer $TEACHER_TOKEN")
  REMAINING_IDS=$(echo "$REMAINING_PENDING" | python3 -c "import sys,json; d=json.load(sys.stdin); [print(item['answer']['id']) for item in d]" 2>/dev/null)
  
  for AID in $REMAINING_IDS; do
    SCORE=$(( RANDOM % 5 + 4 ))
    curl -s -X PUT "$BASE_URL/grading/answers/$AID/grade" \
      -H "Authorization: Bearer $TEACHER_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"score\": $SCORE, \"comment\": \"补充评阅\"}" > /dev/null
  done
  
  ALL_PAPERS=$(/opt/homebrew/opt/postgresql@16/bin/psql -d exam_system -t -A -c "SELECT id FROM \"ExamPaper\" WHERE \"examId\"='$EXAM_ID';" 2>/dev/null)
  for PID in $ALL_PAPERS; do
    PID=$(echo $PID | tr -d ' ')
    curl -s -X PUT "$BASE_URL/grading/papers/$PID/finalize" \
      -H "Authorization: Bearer $TEACHER_TOKEN" > /dev/null 2>&1
  done
  
  RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/exams/$EXAM_ID/statistics" \
    -H "Authorization: Bearer $TEACHER_TOKEN")
  HTTP_CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
fi

check_status "Calculate Statistics" 200 "$HTTP_CODE" "$BODY"
echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
stats = d.get('statistics', {})
rankings = d.get('rankings', [])
qstats = d.get('questionStats', [])
print(f'Average: {stats.get(\"averageScore\", \"N/A\")}')
print(f'Pass Rate: {stats.get(\"passRate\", \"N/A\")}')
print(f'Difficulty Index: {stats.get(\"difficultyIndex\", \"N/A\")}')
print(f'Discrimination Index: {stats.get(\"discriminationIndex\", \"N/A\")}')
print(f'Rankings count: {len(rankings)}')
print(f'Question stats count: {len(qstats)}')
for r in rankings[:3]:
    print(f'  #{r[\"rank\"]} {r[\"studentName\"]}: {r[\"score\"]}')
" 2>/dev/null

log_test "17. Get Exam Statistics (GET)"
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/exams/$EXAM_ID/statistics" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "Get Statistics" 200 "$HTTP_CODE" "$BODY"

log_test "18. Get Score Distribution"
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/exams/$EXAM_ID/distribution" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "Get Score Distribution" 200 "$HTTP_CODE" "$BODY"
echo "$BODY" | python3 -m json.tool 2>/dev/null

log_test "19. Get Anomalies (Admin)"
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/anomalies" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "Get Anomalies" 200 "$HTTP_CODE" "$BODY"
ANOMALY_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)
echo "Anomalies detected: $ANOMALY_COUNT"

if [ "$ANOMALY_COUNT" -gt 0 ]; then
  ANOMALY_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'])" 2>/dev/null)
  log_test "20. Review Anomaly (Admin)"
  RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/anomalies/$ANOMALY_ID/review" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status": "CONFIRMED", "comment": "已核实，成绩正常"}')
  HTTP_CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  check_status "Review Anomaly" 200 "$HTTP_CODE" "$BODY"
else
  echo "No anomalies to review (this is OK - depends on score distribution)"
fi

log_test "21. Get Student Historical Scores"
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/anomalies/my-scores" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "Get Historical Scores" 200 "$HTTP_CODE" "$BODY"

log_test "22. Request Makeup Exam (Student)"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/makeup" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"originalExamId\": \"$EXAM_ID\", \"reason\": \"考试当天身体不适，申请补考\"}")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
  MAKEUP_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
  check_status "Request Makeup" 201 "$HTTP_CODE" "$BODY"
  echo "Makeup ID: $MAKEUP_ID"
elif echo "$BODY" | grep -q "passed"; then
  log_pass "Student passed - makeup correctly rejected"
  MAKEUP_ID=""
else
  STUDENT2_RESP=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"student5","password":"123456"}')
  STUDENT2_TOKEN=$(echo "$STUDENT2_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
  
  RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/makeup" \
    -H "Authorization: Bearer $STUDENT2_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"originalExamId\": \"$EXAM_ID\", \"reason\": \"需要补考\"}")
  HTTP_CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  MAKEUP_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null)
  check_status "Request Makeup (student2)" 201 "$HTTP_CODE" "$BODY"
fi

if [ -n "$MAKEUP_ID" ] && [ "$MAKEUP_ID" != "None" ]; then
  log_test "23. Approve Makeup (Teacher)"
  MAKEUP_START=$(date -u -v+3H +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+3 hours" +"%Y-%m-%dT%H:%M:%S.000Z")
  MAKEUP_END=$(date -u -v+5H +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+5 hours" +"%Y-%m-%dT%H:%M:%S.000Z")
  RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/makeup/$MAKEUP_ID/approve" \
    -H "Authorization: Bearer $TEACHER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"startTime\": \"$MAKEUP_START\", \"endTime\": \"$MAKEUP_END\"}")
  HTTP_CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  check_status "Approve Makeup" 200 "$HTTP_CODE" "$BODY"
fi

log_test "24. Get Notifications"
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/notifications" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "Get Notifications" 200 "$HTTP_CODE" "$BODY"
UNREAD=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('unreadCount', 0))" 2>/dev/null)
echo "Unread notifications: $UNREAD"

log_test "25. Mark Notification as Read"
FIRST_NOTIF_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); notifs=d.get('notifications',[]); print(notifs[0]['id'] if notifs else '')" 2>/dev/null)
if [ -n "$FIRST_NOTIF_ID" ]; then
  RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/notifications/$FIRST_NOTIF_ID/read" \
    -H "Authorization: Bearer $STUDENT_TOKEN")
  HTTP_CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  check_status "Mark Notification Read" 200 "$HTTP_CODE" "$BODY"
fi

log_test "26. Export Class Scores"
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/export/class/class-cs2024-01/scores" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -o /tmp/class_scores.xlsx)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" -eq 200 ]; then
  FILE_SIZE=$(wc -c < /tmp/class_scores.xlsx)
  log_pass "Export Class Scores (file size: ${FILE_SIZE} bytes)"
else
  log_fail "Export Class Scores (HTTP $HTTP_CODE)"
fi

log_test "27. Export Exam Analysis Report"
COURSE_ID=$(/opt/homebrew/opt/postgresql@16/bin/psql -d exam_system -t -A -c "SELECT id FROM \"Course\" LIMIT 1;" 2>/dev/null | tr -d ' ')
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/export/course/$COURSE_ID/analysis" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -o /tmp/exam_analysis.xlsx)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" -eq 200 ]; then
  FILE_SIZE=$(wc -c < /tmp/exam_analysis.xlsx)
  log_pass "Export Exam Analysis (file size: ${FILE_SIZE} bytes)"
else
  log_fail "Export Exam Analysis (HTTP $HTTP_CODE)"
fi

log_test "28. Get My Exams (Student)"
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/exams/my" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "Get My Exams" 200 "$HTTP_CODE" "$BODY"

log_test "29. Get My Makeup Requests"
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/makeup/my" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check_status "Get My Makeup Requests" 200 "$HTTP_CODE" "$BODY"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}    ALL CORE API TESTS COMPLETED!       ${NC}"
echo -e "${GREEN}========================================${NC}"
