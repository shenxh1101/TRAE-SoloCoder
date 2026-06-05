import * as ExcelJS from 'exceljs';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function exportClassScores(classId: string, examId?: string) {
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: { students: true, courses: true },
  });

  if (!classData) {
    throw new AppError('Class not found', 404);
  }

  const where = examId
    ? { examId, exam: { classId }, totalScore: { not: null } }
    : { exam: { classId }, totalScore: { not: null } };

  const papers = await prisma.examPaper.findMany({
    where,
    include: {
      exam: { include: { course: true } },
      student: { select: { id: true, name: true, studentId: true } },
    },
    orderBy: [
      { exam: { startTime: 'desc' } },
      { totalScore: 'desc' },
    ],
  });

  if (papers.length === 0) {
    throw new AppError('No score data found', 404);
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(classData.name + '成绩单');

  worksheet.columns = [
    { header: '学号', key: 'studentId', width: 15 },
    { header: '姓名', key: 'name', width: 12 },
    { header: '考试名称', key: 'examTitle', width: 25 },
    { header: '课程', key: 'courseName', width: 15 },
    { header: '成绩', key: 'score', width: 10 },
    { header: '是否通过', key: 'isPassed', width: 10 },
    { header: '排名', key: 'rank', width: 8 },
    { header: '考试时间', key: 'examTime', width: 20 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  papers.forEach((paper) => {
    worksheet.addRow({
      studentId: paper.student.studentId || '',
      name: paper.student.name,
      examTitle: paper.exam.title,
      courseName: paper.exam.course.name,
      score: paper.totalScore,
      isPassed: paper.isPassed ? '是' : '否',
      rank: paper.rank || '-',
      examTime: paper.exam.startTime.toLocaleString('zh-CN'),
    });
  });

  worksheet.eachRow((row) => {
    row.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer,
    filename: `${classData.name}_成绩单_${new Date().toLocaleDateString('zh-CN')}.xlsx`,
  };
}

export async function exportExamAnalysis(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      class: true,
      teacher: { select: { name: true } },
      exams: {
        where: { status: 'GRADED' },
        include: {
          statistics: true,
          papers: { where: { totalScore: { not: null } } },
        },
        orderBy: { startTime: 'desc' },
      },
    },
  });

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  if (course.exams.length === 0) {
    throw new AppError('No graded exams found for this course', 404);
  }

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet('总体分析');
  summarySheet.columns = [
    { header: '考试名称', key: 'examTitle', width: 25 },
    { header: '考试时间', key: 'examTime', width: 20 },
    { header: '参考人数', key: 'studentCount', width: 12 },
    { header: '平均分', key: 'avgScore', width: 12 },
    { header: '最高分', key: 'highestScore', width: 12 },
    { header: '最低分', key: 'lowestScore', width: 12 },
    { header: '及格率', key: 'passRate', width: 12 },
    { header: '标准差', key: 'stdDev', width: 12 },
    { header: '难度系数', key: 'difficulty', width: 12 },
    { header: '区分度', key: 'discrimination', width: 12 },
  ];

  const headerRow = summarySheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  course.exams.forEach((exam) => {
    if (exam.statistics.length > 0) {
      const stats = exam.statistics[0];
      summarySheet.addRow({
        examTitle: exam.title,
        examTime: exam.startTime.toLocaleString('zh-CN'),
        studentCount: exam.papers.length,
        avgScore: stats.averageScore.toFixed(2),
        highestScore: stats.highestScore,
        lowestScore: stats.lowestScore,
        passRate: `${(stats.passRate * 100).toFixed(1)}%`,
        stdDev: stats.stdDeviation.toFixed(2),
        difficulty: stats.difficultyIndex.toFixed(2),
        discrimination: stats.discriminationIndex.toFixed(2),
      });
    }
  });

  summarySheet.eachRow((row) => {
    row.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (const exam of course.exams) {
    if (exam.statistics.length === 0) continue;

    const stats = exam.statistics[0];
    const questionStats = stats.questionStats as any[];

    if (!questionStats || questionStats.length === 0) continue;

    const sheetName = exam.title.slice(0, 28);
    const detailSheet = workbook.addWorksheet(sheetName);

    detailSheet.columns = [
      { header: '题目序号', key: 'index', width: 10 },
      { header: '题目ID', key: 'questionId', width: 15 },
      { header: '答题人数', key: 'totalCount', width: 12 },
      { header: '答对人数', key: 'correctCount', width: 12 },
      { header: '正确率', key: 'correctRate', width: 12 },
      { header: '难度系数', key: 'difficulty', width: 12 },
      { header: '区分度', key: 'discrimination', width: 12 },
    ];

    const detailHeader = detailSheet.getRow(1);
    detailHeader.font = { bold: true };
    detailHeader.alignment = { vertical: 'middle', horizontal: 'center' };

    questionStats.forEach((q, idx) => {
      detailSheet.addRow({
        index: idx + 1,
        questionId: q.questionId,
        totalCount: q.totalCount,
        correctCount: q.correctCount,
        correctRate: `${(q.correctRate * 100).toFixed(1)}%`,
        difficulty: q.difficulty.toFixed(2),
        discrimination: q.discrimination.toFixed(2),
      });
    });

    detailSheet.eachRow((row) => {
      row.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  }

  const infoSheet = workbook.addWorksheet('说明');
  infoSheet.addRow(['课程名称', course.name]);
  infoSheet.addRow(['课程代码', course.code]);
  infoSheet.addRow(['学分', course.credit]);
  infoSheet.addRow(['授课班级', course.class.name]);
  infoSheet.addRow(['授课教师', course.teacher.name]);
  infoSheet.addRow(['导出时间', new Date().toLocaleString('zh-CN')]);
  infoSheet.addRow([]);
  infoSheet.addRow(['指标说明：']);
  infoSheet.addRow(['难度系数：P = 1 - 正确率，P越大题目越难（0-1）']);
  infoSheet.addRow(['区分度：D = 高分组通过率 - 低分组通过率（-1-1）']);
  infoSheet.addRow(['D≥0.4：区分度很好 | 0.3≤D<0.4：区分度良好']);
  infoSheet.addRow(['0.2≤D<0.3：区分度一般 | D<0.2：区分度较差']);

  infoSheet.getColumn(1).width = 25;
  infoSheet.getColumn(2).width = 40;

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer,
    filename: `${course.name}_试卷质量分析报告_${new Date().toLocaleDateString('zh-CN')}.xlsx`,
  };
}
