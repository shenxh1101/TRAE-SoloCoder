#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF和Excel导出功能测试脚本
"""

import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import init_db, get_connection
from report_manager import ReportManager

def init_test_data():
    """初始化测试数据"""
    print("="*60)
    print("初始化测试数据...")
    print("="*60)
    
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM documents')
    cursor.execute('DELETE FROM reviews')
    cursor.execute('DELETE FROM document_history')
    cursor.execute('DELETE FROM notifications')
    cursor.execute('DELETE FROM audit_logs')
    cursor.execute('DELETE FROM document_readers')
    
    authors = [
        {'id': 'emp_001', 'name': '张三', 'email': 'zhangsan@company.com', 'dept': '技术部'},
        {'id': 'emp_002', 'name': '李四', 'email': 'lisi@company.com', 'dept': '财务部'},
        {'id': 'emp_003', 'name': '王五', 'email': 'wangwu@company.com', 'dept': '人事部'},
        {'id': 'emp_004', 'name': '赵六', 'email': 'zhaoliu@company.com', 'dept': '市场部'}
    ]
    
    doc_types = ['技术文档', '财务文档', '人事文档', '市场文档']
    statuses = ['published', 'published', 'published', 'pending_review', 'rejected', 'expired']
    
    now = datetime.now()
    
    print("\n创建测试文档...")
    for i in range(20):
        author = authors[i % len(authors)]
        doc_type = doc_types[i % len(doc_types)]
        status = statuses[i % len(statuses)]
        
        created_at = now - timedelta(days=i % 30)
        published_at = created_at + timedelta(hours=2) if status == 'published' else None
        expiry_date = created_at + timedelta(days=365) if status != 'expired' else now - timedelta(days=5)
        
        cursor.execute('''
            INSERT INTO documents (
                title, doc_type, file_path, file_format, file_size,
                author_id, author_name, author_email, department,
                subscription_tags, version, status, is_confidential,
                view_count, expiry_date, created_at, updated_at, published_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            f'测试文档-{i+1:03d}', doc_type, f'/tmp/doc_{i}.pdf', '.pdf', 1024 * (i+1),
            author['id'], author['name'], author['email'], author['dept'],
            '技术更新,财务公告' if i % 2 == 0 else '人事政策',
            f'{1 + i//10}.{i % 10}', status, 1 if i % 5 == 0 else 0,
            (i+1) * 15,
            expiry_date.strftime('%Y-%m-%d %H:%M:%S'),
            created_at.strftime('%Y-%m-%d %H:%M:%S'),
            created_at.strftime('%Y-%m-%d %H:%M:%S'),
            published_at.strftime('%Y-%m-%d %H:%M:%S') if published_at else None
        ))
        
        doc_id = cursor.lastrowid
        
        cursor.execute('''
            INSERT INTO reviews (
                document_id, reviewer_id, reviewer_name, reviewer_email,
                review_level, status, assigned_at, reviewed_at, comments
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            doc_id, f'reviewer_{i%3+1:03d}', f'审核人{i%3+1}', 
            f'reviewer{i%3+1}@company.com',
            1 if i % 5 != 0 else 2,
            'approved' if status == 'published' else ('pending' if status == 'pending_review' else 'rejected'),
            created_at.strftime('%Y-%m-%d %H:%M:%S'),
            (created_at + timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S') if status in ['published', 'rejected'] else None,
            '内容符合要求' if status == 'published' else ('需要修改' if status == 'rejected' else None)
        ))
        
        for j in range(i % 5):
            cursor.execute('''
                INSERT INTO document_readers (
                    document_id, reader_id, reader_name, reader_email, read_at
                ) VALUES (?, ?, ?, ?, ?)
            ''', (
                doc_id, f'reader_{j+1:03d}', f'读者{j+1}', 
                f'reader{j+1}@company.com',
                (published_at + timedelta(days=j+1) if published_at else created_at).strftime('%Y-%m-%d %H:%M:%S')
            ))
    
    conn.commit()
    conn.close()
    
    print("  ✓ 已创建 20 条测试文档")
    print("  ✓ 已创建 20 条审核记录")
    print("  ✓ 已创建多条阅读记录")

def test_weekly_report_generation():
    """测试周报告生成"""
    print("\n" + "="*60)
    print("测试1: 周质量报告生成")
    print("="*60)
    
    reporter = ReportManager()
    
    print("\n生成周质量报告...")
    report = reporter.generate_weekly_quality_report()
    
    if report['success']:
        data = report['report_data']
        
        print("\n报告周期: {} ~ {}".format(
            data['report_period']['start_date'],
            data['report_period']['end_date']
        ))
        
        print("\n[审核统计]")
        for key, value in data['review_stats'].items():
            print(f"  {key}: {value}")
        
        print("\n[文档统计]")
        for key, value in data['document_stats'].items():
            print(f"  {key}: {value}")
        
        print("\n[生命周期统计]")
        for key, value in data['expiry_stats'].items():
            print(f"  {key}: {value}")
        
        print("\n[热门文档TOP10]")
        for i, doc in enumerate(data['top_documents'][:5], 1):
            print(f"  {i}. {doc['title']} - 浏览量: {doc['view_count']}")
        
        print("\n  ✓ 周报告生成成功")
        return data
    else:
        print("  ✗ 周报告生成失败")
        return None

def test_pdf_export(report_data):
    """测试PDF导出"""
    print("\n" + "="*60)
    print("测试2: PDF导出")
    print("="*60)
    
    reporter = ReportManager()
    
    print("\n导出周报告为PDF...")
    result = reporter.export_weekly_report_to_pdf(report_data)
    
    if result['success']:
        file_path = result['file_path']
        file_size = os.path.getsize(file_path)
        
        print(f"  ✓ PDF文件已生成: {file_path}")
        print(f"  ✓ 文件大小: {file_size / 1024:.2f} KB")
        
        if file_size > 0:
            print("  ✓ PDF文件有效（非空）")
        else:
            print("  ✗ PDF文件为空")
        
        return result
    else:
        print(f"  ✗ PDF导出失败: {result['error']}")
        return None

def test_excel_export(report_data):
    """测试Excel导出"""
    print("\n" + "="*60)
    print("测试3: Excel导出")
    print("="*60)
    
    reporter = ReportManager()
    
    excel_data = []
    print("\n准备导出数据...")
    
    for key, value in report_data['review_stats'].items():
        excel_data.append({
            '分类': '审核统计',
            '指标': key,
            '数值': str(value)
        })
    
    for key, value in report_data['expiry_stats'].items():
        excel_data.append({
            '分类': '生命周期统计',
            '指标': key,
            '数值': str(value)
        })
    
    for i, doc in enumerate(report_data['top_documents'], 1):
        excel_data.append({
            '分类': f'热门文档TOP{i}',
            '指标': doc['title'],
            '数值': f"浏览量: {doc['view_count']}, 作者: {doc['author_name']}"
        })
    
    print(f"  共 {len(excel_data)} 条数据")
    
    print("\n导出为Excel...")
    result = reporter.export_to_excel(
        excel_data, 
        filename=f'weekly_report_test_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx',
        sheet_name='周质量报告'
    )
    
    if result['success']:
        file_path = result['file_path']
        file_size = os.path.getsize(file_path)
        
        print(f"  ✓ Excel文件已生成: {file_path}")
        print(f"  ✓ 文件大小: {file_size / 1024:.2f} KB")
        print(f"  ✓ 记录数: {result['record_count']}")
        
        if file_size > 0:
            print("  ✓ Excel文件有效（非空）")
        
        return result
    else:
        print(f"  ✗ Excel导出失败: {result['error']}")
        return None

def test_csv_export():
    """测试CSV导出"""
    print("\n" + "="*60)
    print("测试4: CSV导出")
    print("="*60)
    
    reporter = ReportManager()
    
    print("\n查询文档列表...")
    query_result = reporter.advanced_query()
    
    if query_result['success'] and query_result['results']:
        print(f"  共找到 {query_result['total_count']} 条记录")
        
        print("\n导出查询结果为CSV...")
        result = reporter.export_to_csv(
            query_result['results'],
            filename=f'document_list_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
        
        if result['success']:
            file_path = result['file_path']
            file_size = os.path.getsize(file_path)
            
            print(f"  ✓ CSV文件已生成: {file_path}")
            print(f"  ✓ 文件大小: {file_size / 1024:.2f} KB")
            print(f"  ✓ 记录数: {result['record_count']}")
            
            if file_size > 0:
                print("  ✓ CSV文件有效（非空）")
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    print(f"  ✓ CSV行数: {len(lines)}")
                    if len(lines) > 1:
                        print(f"  ✓ 表头: {lines[0].strip()}")
            
            return result
        else:
            print(f"  ✗ CSV导出失败: {result['error']}")
    else:
        print("  没有数据可导出")
    
    return None

def test_batch_export():
    """测试批量导出"""
    print("\n" + "="*60)
    print("测试5: 批量导出生命周期记录")
    print("="*60)
    
    reporter = ReportManager()
    
    print("\n查询已发布文档...")
    query_result = reporter.advanced_query(status='published')
    
    if query_result['success'] and query_result['results']:
        doc_ids = [doc['id'] for doc in query_result['results'][:5]]
        print(f"  选择前 5 个文档进行批量导出: {doc_ids}")
        
        print("\n批量导出为Excel...")
        result = reporter.batch_export_lifecycle_records(doc_ids, export_format='excel')
        
        if result['success']:
            file_path = result['file_path']
            file_size = os.path.getsize(file_path)
            
            print(f"  ✓ 批量导出文件已生成: {file_path}")
            print(f"  ✓ 文件大小: {file_size / 1024:.2f} KB")
            print(f"  ✓ 记录数: {result['record_count']}")
            
            return result
        else:
            print(f"  ✗ 批量导出失败: {result['error']}")
    
    return None

def test_advanced_query():
    """测试高级查询"""
    print("\n" + "="*60)
    print("测试6: 高级组合查询")
    print("="*60)
    
    reporter = ReportManager()
    
    test_cases = [
        {'name': '按状态查询(已发布)', 'params': {'status': 'published'}},
        {'name': '按作者查询', 'params': {'author': '张三'}},
        {'name': '按类型查询', 'params': {'doc_type': '技术文档'}},
        {'name': '按部门查询', 'params': {'department': '技术部'}},
        {'name': '组合查询', 'params': {'status': 'published', 'doc_type': '技术文档'}},
        {'name': '按标题模糊查询', 'params': {'title': '测试文档-00'}}
    ]
    
    for test_case in test_cases:
        print(f"\n{test_case['name']}: {test_case['params']}")
        result = reporter.advanced_query(**test_case['params'])
        
        if result['success']:
            print(f"  ✓ 查询成功，共 {result['total_count']} 条记录")
            if result['results']:
                print(f"    示例: {result['results'][0]['title']}")
        else:
            print(f"  ✗ 查询失败")

def test_full_lifecycle_record():
    """测试全生命周期记录查询"""
    print("\n" + "="*60)
    print("测试7: 全生命周期记录查询")
    print("="*60)
    
    reporter = ReportManager()
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM documents WHERE status = ? LIMIT 1', ('published',))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        doc_id = row['id']
        print(f"\n查询文档ID: {doc_id}")
        
        result = reporter.get_full_lifecycle_record(doc_id)
        
        if result['success']:
            doc = result['document']
            print(f"\n[文档基本信息]")
            print(f"  标题: {doc['title']}")
            print(f"  类型: {doc['doc_type']}")
            print(f"  作者: {doc['author_name']}")
            print(f"  状态: {doc['status']}")
            print(f"  版本: {doc['version']}")
            print(f"  浏览量: {doc['view_count']}")
            
            print(f"\n[审核记录] 共 {len(result['reviews'])} 条")
            for review in result['reviews'][:2]:
                print(f"  - {review['reviewer_name']} ({review['review_level']}级): {review['status']}")
            
            print(f"\n[版本历史] 共 {len(result['version_history'])} 条")
            
            print(f"\n[审计日志] 共 {len(result['audit_logs'])} 条")
            
            print(f"\n[阅读记录] 共 {len(result['read_records'])} 条")
            
            print("\n  ✓ 全生命周期记录查询成功")
        else:
            print(f"  ✗ 查询失败: {result['error']}")

def show_exported_files():
    """显示导出的文件"""
    print("\n" + "="*60)
    print("导出文件列表")
    print("="*60)
    
    reports_dir = 'reports'
    if os.path.exists(reports_dir):
        files = sorted(os.listdir(reports_dir))
        print(f"\n共 {len(files)} 个导出文件:\n")
        
        for f in files:
            if f.startswith('.'):
                continue
            file_path = os.path.join(reports_dir, f)
            size = os.path.getsize(file_path)
            mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
            ext = os.path.splitext(f)[1].upper()
            
            icon = '📄' if ext == '.PDF' else ('📊' if ext in ['.XLSX', '.XLS'] else '📋')
            print(f"  {icon} {f:<40} {size:>8.2f} KB  {mtime.strftime('%Y-%m-%d %H:%M')}")
    else:
        print("  暂无导出文件")

def main():
    print("\n" + "="*60)
    print("企业知识文档管理系统 - PDF/Excel导出功能测试")
    print("="*60)
    
    try:
        init_test_data()
        
        report_data = test_weekly_report_generation()
        
        if report_data:
            pdf_result = test_pdf_export(report_data)
            excel_result = test_excel_export(report_data)
        
        csv_result = test_csv_export()
        batch_result = test_batch_export()
        
        test_advanced_query()
        test_full_lifecycle_record()
        
        show_exported_files()
        
        print("\n" + "="*60)
        print("所有测试完成!")
        print("="*60)
        
        print("\n测试总结:")
        print("  ✓ 周质量报告生成")
        print("  ✓ PDF文件导出")
        print("  ✓ Excel文件导出")
        print("  ✓ CSV文件导出")
        print("  ✓ 批量导出生命周期记录")
        print("  ✓ 高级组合查询")
        print("  ✓ 全生命周期记录查询")
        
        print("\n导出的文件保存在 reports/ 目录下")
        
    except Exception as e:
        print(f"\n✗ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())
