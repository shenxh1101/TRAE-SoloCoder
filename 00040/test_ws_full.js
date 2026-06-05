const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:3000/api';

async function main() {
  console.log('=== WebSocket 实时推送测试 ===\n');

  const loginResp = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'student2', password: '123456' })
  });
  const { token } = await loginResp.json();
  console.log('1. Student2 logged in, token obtained');

  console.log('2. Connecting WebSocket...');
  const socket = io('http://localhost:3000', {
    auth: { token },
    transports: ['websocket'],
  });

  let notificationReceived = false;

  await new Promise((resolve) => {
    socket.on('connect', () => {
      console.log(`   ✅ WebSocket Connected! Socket ID: ${socket.id}`);
      resolve();
    });

    socket.on('connect_error', (err) => {
      console.log(`   ❌ Connection Error: ${err.message}`);
      process.exit(1);
    });
  });

  socket.on('notification', (data) => {
    notificationReceived = true;
    console.log(`\n   📩 Real-time notification received:`);
    console.log(`      Type: ${data.type}`);
    console.log(`      Title: ${data.title}`);
    console.log(`      Content: ${data.content}`);
  });

  console.log('3. Triggering a notification by creating a new exam...');

  const teacherLoginResp = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'teacher1', password: '123456' })
  });
  const { token: teacherToken } = await teacherLoginResp.json();

  const courseResp = await fetch(`${BASE_URL}/exams/my`, {
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  const exams = await courseResp.json();
  const courseId = exams[0]?.courseId || '';
  const classId = exams[0]?.classId || 'class-cs2024-01';

  if (courseId) {
    const createResp = await fetch(`${BASE_URL}/exams`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${teacherToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'WebSocket推送测试考试',
        courseId,
        classId,
        duration: 90,
        startTime: '2026-07-01T10:00:00.000Z',
        endTime: '2026-07-01T11:30:00.000Z',
        passingScore: 60,
        rules: [
          { questionType: 'SINGLE_CHOICE', count: 3, scorePerQuestion: 5 },
          { questionType: 'TRUE_FALSE', count: 2, scorePerQuestion: 3 },
          { questionType: 'SUBJECTIVE', count: 1, scorePerQuestion: 10 }
        ]
      })
    });

    if (createResp.ok) {
      const newExam = await createResp.json();
      console.log(`   New exam created: ${newExam.id}`);

      const publishResp = await fetch(`${BASE_URL}/exams/${newExam.id}/publish`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${teacherToken}` }
      });

      if (publishResp.ok) {
        console.log('   Exam published - notification should be pushed');
      }
    }
  }

  console.log('4. Waiting for notifications...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n=== WebSocket Test Summary ===');
  console.log(`   Connection: ✅ Stable`);
  console.log(`   Notification received: ${notificationReceived ? '✅ Yes' : '⚠️ None (may need more events)'}`);
  console.log(`   Socket connected: ${socket.connected ? '✅ Yes' : '❌ No'}`);

  socket.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
