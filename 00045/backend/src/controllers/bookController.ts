import { Response } from 'express';
import { z } from 'zod';
import XLSX from 'xlsx';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

const createBookSchema = z.object({
  isbn: z.string().min(1, 'ISBN不能为空'),
  title: z.string().min(1, '书名不能为空'),
  author: z.string().min(1, '作者不能为空'),
  publisher: z.string().optional().nullable(),
  publishDate: z.string().optional().nullable(),
  category: z.string().min(1, '分类不能为空'),
  description: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  totalCopies: z.number().min(1, '总册数至少1本').default(1),
  price: z.number().default(0),
});

const updateBookSchema = z.object({
  title: z.string().min(1, '书名不能为空').optional(),
  author: z.string().min(1, '作者不能为空').optional(),
  publisher: z.string().optional().nullable(),
  publishDate: z.string().optional().nullable(),
  category: z.string().optional(),
  description: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  totalCopies: z.number().min(1).optional(),
  price: z.number().optional(),
});

export const getBooks = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, pageSize = 10, category, search, available } = req.query;
    
    const where: any = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { author: { contains: search as string, mode: 'insensitive' } },
        { isbn: { contains: search as string } },
      ];
    }
    if (available === 'true') {
      where.availableCopies = { gt: 0 };
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.book.count({ where }),
    ]);

    res.json({
      data: books,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const getBookById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        borrowRecords: {
          take: 5,
          orderBy: { borrowDate: 'desc' },
          include: { user: { select: { name: true } } },
        },
        reservations: {
          where: { status: 'PENDING' },
          orderBy: { queuePosition: 'asc' },
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!book) {
      return res.status(404).json({ message: '图书不存在' });
    }

    res.json(book);
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const createBook = async (req: AuthRequest, res: Response) => {
  try {
    const data = createBookSchema.parse(req.body);
    
    const existingBook = await prisma.book.findUnique({
      where: { isbn: data.isbn },
    });

    if (existingBook) {
      return res.status(400).json({ message: 'ISBN已存在' });
    }

    const book = await prisma.book.create({
      data: {
        ...data,
        publishDate: data.publishDate ? new Date(data.publishDate) : null,
        availableCopies: data.totalCopies,
      },
    });

    res.status(201).json(book);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '请求参数错误', errors: error.errors });
    }
    console.error('Create book error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const updateBook = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateBookSchema.parse(req.body);

    const book = await prisma.book.update({
      where: { id },
      data: {
        ...data,
        publishDate: data.publishDate ? new Date(data.publishDate) : undefined,
      },
    });

    res.json(book);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '请求参数错误', errors: error.errors });
    }
    console.error('Update book error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const deleteBook = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.book.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

export const importBooks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传Excel文件' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const books = jsonData.map((row: any) => ({
      isbn: String(row.ISBN || row.isbn || ''),
      title: String(row.书名 || row.title || ''),
      author: String(row.作者 || row.author || ''),
      publisher: String(row.出版社 || row.publisher || ''),
      category: String(row.分类 || row.category || '其他'),
      totalCopies: Number(row.册数 || row.totalCopies || 1),
      price: Number(row.价格 || row.price || 0),
      description: String(row.简介 || row.description || ''),
    }));

    const validBooks = books.filter(
      (book) => book.isbn && book.title && book.author
    );

    let successCount = 0;
    let failCount = 0;

    for (const book of validBooks) {
      try {
        const existing = await prisma.book.findUnique({
          where: { isbn: book.isbn },
        });

        if (!existing) {
          await prisma.book.create({
            data: {
              ...book,
              availableCopies: book.totalCopies,
            },
          });
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    res.json({
      message: '导入完成',
      successCount,
      failCount,
      total: books.length,
    });
  } catch (error) {
    console.error('Import books error:', error);
    res.status(500).json({ message: '导入失败' });
  }
};

export const exportBooks = async (req: AuthRequest, res: Response) => {
  try {
    const books = await prisma.book.findMany({
      select: {
        isbn: true,
        title: true,
        author: true,
        publisher: true,
        category: true,
        totalCopies: true,
        availableCopies: true,
        borrowCount: true,
        price: true,
      },
    });

    const exportData = books.map((book) => ({
      ISBN: book.isbn,
      书名: book.title,
      作者: book.author,
      出版社: book.publisher,
      分类: book.category,
      总册数: book.totalCopies,
      可借册数: book.availableCopies,
      借阅次数: book.borrowCount,
      价格: book.price,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '图书列表');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=books.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Export books error:', error);
    res.status(500).json({ message: '导出失败' });
  }
};
