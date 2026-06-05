import bcrypt from 'bcryptjs';
import prisma from './config/prisma';
import { UserRole } from '@prisma/client';

async function main() {
  console.log('Start seeding...');

  const hashedPassword = await bcrypt.hash('123456', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

  const users = [
    {
      username: 'admin',
      password: adminPassword,
      name: '系统管理员',
      email: 'admin@library.edu',
      phone: '13800000000',
      role: UserRole.ADMIN,
      department: '图书馆',
    },
    {
      username: 'student001',
      password: hashedPassword,
      name: '张三',
      email: 'zhangsan@student.edu',
      phone: '13800000001',
      role: UserRole.STUDENT,
      department: '计算机学院',
      studentId: '2024001',
    },
    {
      username: 'student002',
      password: hashedPassword,
      name: '李四',
      email: 'lisi@student.edu',
      phone: '13800000002',
      role: UserRole.STUDENT,
      department: '文学院',
      studentId: '2024002',
    },
    {
      username: 'teacher001',
      password: hashedPassword,
      name: '王教授',
      email: 'wang@teacher.edu',
      phone: '13800000003',
      role: UserRole.TEACHER,
      department: '计算机学院',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: user,
    });
  }

  console.log('Users created');

  const books = [
    {
      isbn: '9787111213826',
      title: 'JavaScript高级程序设计',
      author: 'Nicholas C. Zakas',
      publisher: '机械工业出版社',
      category: '计算机科学',
      description: 'JavaScript经典入门教材',
      totalCopies: 5,
      availableCopies: 5,
      price: 129.0,
    },
    {
      isbn: '9787111544937',
      title: '深入理解计算机系统',
      author: 'Randal E. Bryant',
      publisher: '机械工业出版社',
      category: '计算机科学',
      description: '计算机系统领域经典著作',
      totalCopies: 3,
      availableCopies: 3,
      price: 139.0,
    },
    {
      isbn: '9787020002207',
      title: '红楼梦',
      author: '曹雪芹',
      publisher: '人民文学出版社',
      category: '文学小说',
      description: '中国古典四大名著之一',
      totalCopies: 10,
      availableCopies: 10,
      price: 59.8,
    },
    {
      isbn: '9787544270878',
      title: '百年孤独',
      author: '加西亚·马尔克斯',
      publisher: '南海出版公司',
      category: '文学小说',
      description: '魔幻现实主义代表作',
      totalCopies: 5,
      availableCopies: 5,
      price: 45.0,
    },
    {
      isbn: '9787111300992',
      title: '算法导论',
      author: 'Thomas H. Cormen',
      publisher: '机械工业出版社',
      category: '计算机科学',
      description: '算法领域经典教材',
      totalCopies: 4,
      availableCopies: 4,
      price: 128.0,
    },
    {
      isbn: '9787508647357',
      title: '人类简史',
      author: '尤瓦尔·赫拉利',
      publisher: '中信出版社',
      category: '历史人文',
      description: '从动物到上帝的人类进化史',
      totalCopies: 8,
      availableCopies: 8,
      price: 68.0,
    },
    {
      isbn: '9787111407010',
      title: '设计模式',
      author: 'Erich Gamma',
      publisher: '机械工业出版社',
      category: '计算机科学',
      description: '可复用面向对象软件的基础',
      totalCopies: 4,
      availableCopies: 4,
      price: 89.0,
    },
    {
      isbn: '9787115357878',
      title: '经济学原理',
      author: '曼昆',
      publisher: '北京大学出版社',
      category: '经济管理',
      description: '经济学入门经典教材',
      totalCopies: 6,
      availableCopies: 6,
      price: 128.0,
    },
    {
      isbn: '9787100016636',
      title: '理想国',
      author: '柏拉图',
      publisher: '商务印书馆',
      category: '政治法律',
      description: '西方哲学经典著作',
      totalCopies: 5,
      availableCopies: 5,
      price: 38.0,
    },
    {
      isbn: '9787532734554',
      title: '三体',
      author: '刘慈欣',
      publisher: '重庆出版社',
      category: '文学小说',
      description: '中国科幻里程碑之作',
      totalCopies: 10,
      availableCopies: 10,
      price: 93.0,
    },
  ];

  for (const book of books) {
    await prisma.book.upsert({
      where: { isbn: book.isbn },
      update: {},
      create: book,
    });
  }

  console.log('Books created');
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
