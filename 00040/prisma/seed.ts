import { PrismaClient, QuestionType, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@school.edu',
      passwordHash,
      name: '教务管理员',
      role: UserRole.ADMIN,
      department: '教务处',
    },
  });

  const teacher = await prisma.user.upsert({
    where: { username: 'teacher1' },
    update: {},
    create: {
      username: 'teacher1',
      email: 'teacher1@school.edu',
      passwordHash,
      name: '张老师',
      role: UserRole.TEACHER,
      department: '计算机学院',
    },
  });

  const cls = await prisma.class.upsert({
    where: { id: 'class-cs2024-01' },
    update: {},
    create: {
      id: 'class-cs2024-01',
      name: '计算机科学2024级1班',
      grade: '2024',
      department: '计算机学院',
    },
  });

  const students = [];
  for (let i = 1; i <= 10; i++) {
    const student = await prisma.user.upsert({
      where: { username: `student${i}` },
      update: {},
      create: {
        username: `student${i}`,
        email: `student${i}@school.edu`,
        passwordHash,
        name: `学生${i}`,
        role: UserRole.STUDENT,
        studentId: `2024${String(i).padStart(4, '0')}`,
        classId: cls.id,
      },
    });
    students.push(student);
  }

  const course = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      name: '数据结构与算法',
      code: 'CS101',
      credit: 4,
      classId: cls.id,
      teacherId: teacher.id,
    },
  });

  const questionBank = await prisma.questionBank.upsert({
    where: { id: 'qb-cs101-main' },
    update: {},
    create: {
      id: 'qb-cs101-main',
      name: '数据结构与算法题库',
      courseId: course.id,
      description: '包含选择题、判断题和主观题',
    },
  });

  const choiceQuestions = [];
  for (let i = 1; i <= 20; i++) {
    const q = await prisma.question.create({
      data: {
        bankId: questionBank.id,
        type: QuestionType.SINGLE_CHOICE,
        content: `以下关于数据结构第${i}个知识点的描述，哪个是正确的？`,
        options: {
          A: `选项A - 第${i}题`,
          B: `选项B - 第${i}题`,
          C: `选项C - 第${i}题`,
          D: `选项D - 第${i}题`,
        },
        answer: i % 4 === 0 ? 'D' : i % 3 === 0 ? 'C' : i % 2 === 0 ? 'B' : 'A',
        score: 5,
        difficulty: 0.3 + (i % 5) * 0.1,
        knowledgePoint: `知识点${Math.ceil(i / 4)}`,
      },
    });
    choiceQuestions.push(q);
  }

  const tfQuestions = [];
  for (let i = 1; i <= 10; i++) {
    const q = await prisma.question.create({
      data: {
        bankId: questionBank.id,
        type: QuestionType.TRUE_FALSE,
        content: `判断题${i}：二叉搜索树的中序遍历结果一定是有序的。`,
        options: { T: '正确', F: '错误' },
        answer: i % 2 === 0 ? 'T' : 'F',
        score: 3,
        difficulty: 0.2 + (i % 4) * 0.1,
        knowledgePoint: `判断知识点${i}`,
      },
    });
    tfQuestions.push(q);
  }

  const subjectiveQuestions = [];
  for (let i = 1; i <= 5; i++) {
    const q = await prisma.question.create({
      data: {
        bankId: questionBank.id,
        type: QuestionType.SUBJECTIVE,
        content: `简答题${i}：请描述${i % 2 === 0 ? '快速排序' : '归并排序'}算法的基本思想和时间复杂度分析。`,
        answer: `参考答案${i}：...`,
        score: 10,
        difficulty: 0.5 + (i % 3) * 0.1,
        knowledgePoint: `主观知识点${i}`,
      },
    });
    subjectiveQuestions.push(q);
  }

  console.log('Seed data created successfully!');
  console.log({
    admin: admin.username,
    teacher: teacher.username,
    students: students.map(s => s.username),
    course: course.code,
    questionBank: questionBank.name,
    choiceQuestions: choiceQuestions.length,
    tfQuestions: tfQuestions.length,
    subjectiveQuestions: subjectiveQuestions.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
