#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
企业知识文档审核与发布管理系统
"""

import os
import sys
import argparse
from datetime import datetime, timedelta

from models import init_db, get_connection
from document_uploader import DocumentUploader
from review_manager import ReviewManager
from publish_manager import PublishManager
from lifecycle_manager import LifecycleManager
from report_manager import ReportManager

class DocumentManagementSystem:
    def __init__(self):
        init_db()
        self.uploader = DocumentUploader()
        self.reviewer = ReviewManager()
        self.publisher = PublishManager()
        self.lifecycle = LifecycleManager()
        self.reporter = ReportManager()
    
    def upload_document(self, file_path, title, doc_type, author_info, 
                        subscription_tags=None):
        """上传文档"""
        print(f"\n{'='*50}")
        print(f"开始上传文档: {title}")
        print(f"{'='*50}")
        
        result = self.uploader.upload_document(
            file_path, title, doc_type, author_info, subscription_tags
        )
        
        if result['success']:
            print(f"✓ 文档上传成功，ID: {result['document_id']}")
            print(f"  - 是否机密: {result['is_confidential']}")
            print(f"  - 审核级别: {result['review_level']}级")
            
            if result['is_confidential']:
                print(f"  - 检测到机密关键词: {result['confidential_keywords']}")
            
            assign_result = self.reviewer.assign_reviewer(result['document_id'])
            if assign_result['success']:
                print(f"  - 已分配审核人: {assign_result['reviewer']['name']}")
        else:
            print(f"✗ 上传失败: {result['error']}")
            if 'sensitive_words' in result:
                print(f"  - 敏感内容: {result['sensitive_words']}")
        
        return result
    
    def process_review(self, review_id, reviewer_id, status, comments=""):
        """处理审核"""
        print(f"\n{'='*50}")
        print(f"处理审核: {review_id}")
        print(f"{'='*50}")
        
        result = self.reviewer.process_review(review_id, reviewer_id, status, comments)
        
        if result['success']:
            print(f"✓ 审核完成")
            print(f"  - 文档状态: {result['document_status']}")
            
            if result['document_status'] == 'published':
                publish_result = self.publisher.publish_document(result['document_id'])
                if publish_result['success']:
                    print(f"  - 文档已发布")
                    print(f"  - 推送到群组: {len(publish_result['push_result'])}个")
        else:
            print(f"✗ 审核处理失败: {result['error']}")
        
        return result
    
    def run_daily_tasks(self):
        """执行每日定时任务"""
        print(f"\n{'='*50}")
        print(f"执行每日定时任务 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*50}")
        
        print("\n1. 检查超时审核...")
        timeout_result = self.reviewer.check_timeout_reviews()
        print(f"   - 检查了 {timeout_result['checked_count']} 个待审核")
        print(f"   - 升级了 {timeout_result['escalated_count']} 个超时审核")
        
        print("\n2. 扫描即将过期文档...")
        expiring_result = self.lifecycle.scan_expiring_documents()
        print(f"   - 扫描到 {expiring_result['expiring_count']} 个即将过期文档")
        print(f"   - 已提醒 {expiring_result['reminded_count']} 位作者")
        
        print("\n3. 下架过期文档...")
        expired_result = self.lifecycle.take_down_expired_documents()
        print(f"   - 扫描到 {expired_result['expired_count']} 个过期文档")
        print(f"   - 已下架 {expired_result['taken_down_count']} 个文档")
        
        print("\n✓ 每日任务执行完成")
        
        return {
            'timeout_check': timeout_result,
            'expiring_scan': expiring_result,
            'expired_takedown': expired_result
        }
    
    def generate_weekly_report(self, export_formats=None):
        """生成周报告"""
        print(f"\n{'='*50}")
        print(f"生成周质量报告")
        print(f"{'='*50}")
        
        report = self.reporter.generate_weekly_quality_report()
        
        if report['success']:
            data = report['report_data']
            print(f"✓ 报告生成成功")
            print(f"  - 报告周期: {data['report_period']['start_date']} ~ {data['report_period']['end_date']}")
            print(f"\n  审核统计:")
            print(f"    - 总审核数: {data['review_stats']['total_reviews']}")
            print(f"    - 审核通过率: {data['review_stats']['approval_rate']}%")
            print(f"    - 平均审核时长: {data['review_stats']['avg_review_hours']}小时")
            print(f"\n  生命周期统计:")
            print(f"    - 已发布文档: {data['expiry_stats']['total_published']}")
            print(f"    - 过期率: {data['expiry_stats']['expiry_rate']}%")
            print(f"    - 即将过期: {data['expiry_stats']['expiring_soon']}个")
            
            if export_formats:
                for fmt in export_formats:
                    if fmt == 'pdf':
                        result = self.reporter.export_weekly_report_to_pdf(data)
                        if result['success']:
                            print(f"\n  - 已导出PDF: {result['file_path']}")
                        else:
                            print(f"\n  - PDF导出失败: {result['error']}")
                    elif fmt == 'excel':
                        result = self.reporter.export_to_excel([data['review_stats'], data['expiry_stats']])
                        if result['success']:
                            print(f"  - 已导出Excel: {result['file_path']}")
        
        return report
    
    def query_documents(self, **kwargs):
        """高级查询文档"""
        print(f"\n{'='*50}")
        print(f"文档查询")
        print(f"{'='*50}")
        print(f"查询条件: {kwargs}")
        
        result = self.reporter.advanced_query(**kwargs)
        
        if result['success']:
            print(f"\n✓ 查询完成，共找到 {result['total_count']} 条记录:")
            for i, doc in enumerate(result['results'][:10], 1):
                print(f"  {i}. [{doc['status']}] {doc['title']} - {doc['author_name']}")
            
            if result['total_count'] > 10:
                print(f"  ... 还有 {result['total_count'] - 10} 条记录")
        
        return result
    
    def revise_document(self, document_id, new_file_path, author_info, change_log=""):
        """修订文档"""
        print(f"\n{'='*50}")
        print(f"修订文档: {document_id}")
        print(f"{'='*50}")
        
        result = self.lifecycle.revise_document(document_id, new_file_path, author_info, change_log)
        
        if result['success']:
            print(f"✓ 文档修订成功")
            print(f"  - 旧版本: {result['old_version']}")
            print(f"  - 新版本: {result['new_version']}")
            print(f"  - 状态: {result['status']}")
            
            assign_result = self.reviewer.assign_reviewer(document_id)
            if assign_result['success']:
                print(f"  - 已分配审核人: {assign_result['reviewer']['name']}")
        else:
            print(f"✗ 修订失败: {result['error']}")
        
        return result
    
    def withdraw_document(self, document_id, operator_info, reason=""):
        """撤回文档"""
        print(f"\n{'='*50}")
        print(f"撤回文档: {document_id}")
        print(f"{'='*50}")
        
        result = self.lifecycle.withdraw_document(document_id, operator_info, reason)
        
        if result['success']:
            print(f"✓ 文档撤回成功: {result['title']}")
        else:
            print(f"✗ 撤回失败: {result['error']}")
        
        return result

def create_sample_files():
    """创建示例文件用于测试"""
    samples_dir = 'sample_docs'
    os.makedirs(samples_dir, exist_ok=True)
    
    sample_files = []
    
    content1 = """技术规范文档

这是一份关于系统架构的技术规范文档。
本文档包含机密信息，请妥善保管。

1. 概述
2. 系统架构
3. 核心技术
"""
    file1 = os.path.join(samples_dir, 'tech_spec.txt')
    with open(file1, 'w', encoding='utf-8') as f:
        f.write(content1)
    sample_files.append(('tech_spec.txt', file1, '技术文档'))
    
    content2 = """2024年度财务报告

本报告包含公司2024年度财务数据。
注意：所有数据均为商业秘密，不得外泄。

一、营收情况
二、成本分析
三、利润预测
"""
    file2 = os.path.join(samples_dir, 'finance_report.txt')
    with open(file2, 'w', encoding='utf-8') as f:
        f.write(content2)
    sample_files.append(('finance_report.txt', file2, '财务文档'))
    
    content3 = """员工手册

欢迎加入我们的团队！

第一章：入职须知
第二章：考勤制度
第三章：福利政策
第四章：职业发展
"""
    file3 = os.path.join(samples_dir, 'employee_handbook.txt')
    with open(file3, 'w', encoding='utf-8') as f:
        f.write(content3)
    sample_files.append(('employee_handbook.txt', file3, '人事文档'))
    
    content4 = """市场推广方案

2024年Q2市场营销推广方案

目标：提升品牌知名度
预算：50万元
周期：3个月
"""
    file4 = os.path.join(samples_dir, 'marketing_plan.txt')
    with open(file4, 'w', encoding='utf-8') as f:
        f.write(content4)
    sample_files.append(('marketing_plan.txt', file4, '市场文档'))
    
    print(f"✓ 已创建 {len(sample_files)} 个示例文件在 {samples_dir}/ 目录下")
    return sample_files

def run_demo():
    """运行演示程序"""
    print("\n" + "="*70)
    print("企业知识文档审核与发布管理系统 - 演示程序")
    print("="*70)
    
    dms = DocumentManagementSystem()
    
    print("\n步骤1: 创建示例文件")
    sample_files = create_sample_files()
    
    author_info = {
        'id': 'emp_001',
        'name': '张三',
        'email': 'zhangsan@company.com',
        'department': '技术部'
    }
    
    print("\n步骤2: 上传文档")
    doc_ids = []
    for name, path, doc_type in sample_files:
        tags = ['技术更新'] if doc_type == '技术文档' else ['人事政策'] if doc_type == '人事文档' else ['财务公告']
        result = dms.upload_document(
            path, 
            f"示例-{name.replace('.txt', '')}", 
            doc_type, 
            author_info,
            tags
        )
        if result['success']:
            doc_ids.append(result['document_id'])
    
    print(f"\n步骤3: 查看待审核列表")
    pending_reviews = dms.reviewer.get_pending_reviews()
    print(f"当前有 {len(pending_reviews)} 个待审核")
    for r in pending_reviews:
        print(f"  - [{r['id']}] {r['title']} - {r['reviewer_name']} ({'一级' if r['review_level'] == 1 else '二级'}审核)")
    
    print(f"\n步骤4: 处理审核 (前2个通过，1个拒绝)")
    for i, review in enumerate(pending_reviews[:3]):
        status = 'approved' if i < 2 else 'rejected'
        comments = "审核通过，内容符合要求" if status == 'approved' else "需要修改部分内容"
        dms.process_review(
            review['id'], 
            review['reviewer_id'], 
            status,
            comments
        )
    
    print(f"\n步骤5: 模拟文档阅读")
    reader_info = {
        'id': 'emp_002',
        'name': '李四',
        'email': 'lisi@company.com'
    }
    if doc_ids:
        dms.lifecycle.record_document_read(doc_ids[0], reader_info)
        dms.lifecycle.record_document_read(doc_ids[0], reader_info)
    
    print(f"\n步骤6: 查询已发布文档")
    published = dms.publisher.get_published_documents()
    print(f"已发布文档: {len(published)} 个")
    
    print(f"\n步骤7: 高级查询示例")
    dms.query_documents(status='published', author='张三')
    
    print(f"\n步骤8: 生成周质量报告")
    dms.generate_weekly_report(export_formats=['csv'])
    
    print(f"\n步骤9: 执行每日定时任务")
    dms.run_daily_tasks()
    
    print(f"\n步骤10: 查看文档生命周期记录")
    if doc_ids:
        lifecycle = dms.reporter.get_full_lifecycle_record(doc_ids[0])
        if lifecycle['success']:
            print(f"\n文档 '{lifecycle['document']['title']}' 的完整记录:")
            print(f"  - 版本: {lifecycle['document']['version']}")
            print(f"  - 状态: {lifecycle['document']['status']}")
            print(f"  - 浏览量: {lifecycle['document']['view_count']}")
            print(f"  - 审核次数: {len(lifecycle['reviews'])}")
            print(f"  - 操作日志: {len(lifecycle['audit_logs'])}条")
    
    print("\n" + "="*70)
    print("演示程序执行完成！")
    print("="*70)
    print("\n系统功能总结:")
    print("  ✓ 1. 文档上传检测（格式、敏感词、机密检测）")
    print("  ✓ 2. 机密文档触发二级审核")
    print("  ✓ 3. 按类型自动分配审核人")
    print("  ✓ 4. 超时自动升级审核")
    print("  ✓ 5. 审核通过自动发布和推送")
    print("  ✓ 6. 过期文档扫描和提醒")
    print("  ✓ 7. 文档修订和版本管理")
    print("  ✓ 8. 文档撤回功能")
    print("  ✓ 9. 周质量报告生成")
    print("  ✓ 10. 高级查询和批量导出")

def run_scheduler_demo():
    """调度器演示"""
    print("\n" + "="*70)
    print("定时调度功能演示")
    print("="*70)
    
    try:
        from scheduler import DocumentScheduler
        
        scheduler = DocumentScheduler()
        
        print("\n已注册的定时任务:")
        scheduler.scheduler.start()
        jobs = scheduler.list_jobs()
        for job in jobs:
            print(f"  - {job['id']}: {job['name']}")
            print(f"    下次执行: {job['next_run_time']}")
        scheduler.scheduler.shutdown()
        
        print("\n立即执行周报告生成任务（包含PDF/Excel导出...")
        scheduler.job_weekly_report()
        
        print("\n" + "="*70)
        print("调度器演示完成！")
        print("="*70)
        
    except ImportError as e:
        print(f"\n✗ 调度器不可用: {e}")
        print("请先安装依赖: pip install apscheduler")

def test_pdf_export():
    """测试PDF导出功能"""
    print("\n" + "="*70)
    print("PDF导出功能测试")
    print("="*70)
    
    dms = DocumentManagementSystem()
    
    print("\n1. 生成周质量报告...")
    report = dms.generate_weekly_report()
    
    if report['success']:
        data = report['report_data']
        
        print("\n2. 导出为PDF...")
        pdf_result = dms.reporter.export_weekly_report_to_pdf(data)
        
        if pdf_result['success']:
            print(f"   ✓ PDF导出成功: {pdf_result['file_path']}")
            
            import os
            if os.path.exists(pdf_result['file_path']):
                file_size = os.path.getsize(pdf_result['file_path'])
                print(f"   ✓ 文件大小: {file_size / 1024:.2f} KB")
        else:
            print(f"   ✗ PDF导出失败: {pdf_result['error']}")
        
        print("\n3. 导出为Excel...")
        excel_data = []
        for key, value in data['review_stats'].items():
            excel_data.append({'指标': key, '数值': value})
        for key, value in data['expiry_stats'].items():
            excel_data.append({'指标': key, '数值': value})
        
        excel_result = dms.reporter.export_to_excel(excel_data, sheet_name='周质量报告')
        
        if excel_result['success']:
            print(f"   ✓ Excel导出成功: {excel_result['file_path']}")
            if os.path.exists(excel_result['file_path']):
                file_size = os.path.getsize(excel_result['file_path'])
                print(f"   ✓ 文件大小: {file_size / 1024:.2f} KB")
        else:
            print(f"   ✗ Excel导出失败: {excel_result['error']}")
        
        print("\n4. 导出查询结果为CSV...")
        query_result = dms.query_documents()
        if query_result['success'] and query_result['results']:
            csv_result = dms.reporter.export_to_csv(query_result['results'])
            if csv_result['success']:
                print(f"   ✓ CSV导出成功: {csv_result['file_path']}")
    
    print("\n" + "="*70)
    print("PDF导出测试完成！")
    print("="*70)

def test_expiry_management():
    """测试文档过期管理"""
    print("\n" + "="*70)
    print("文档过期管理测试")
    print("="*70)
    
    from datetime import datetime, timedelta
    from models import get_connection
    
    dms = DocumentManagementSystem()
    
    print("\n1. 创建即将过期的测试文档...")
    author_info = {
        'id': 'test_001',
        'name': '测试用户',
        'email': 'test@company.com',
        'department': '技术部'
    }
    
    samples_dir = 'sample_docs'
    import os
    test_file = os.path.join(samples_dir, 'tech_spec.txt')
    
    if os.path.exists(test_file):
        result = dms.upload_document(
            test_file, "测试-过期测试文档", "技术文档", 
            author_info, ['技术更新']
        )
        
        if result['success']:
            doc_id = result['document_id']
            print(f"   ✓ 文档创建成功，ID: {doc_id}")
            
            print("\n2. 修改过期日期为15天后...")
            conn = get_connection()
            cursor = conn.cursor()
            new_expiry = (datetime.now() + timedelta(days=15)).strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute('UPDATE documents SET expiry_date = ? WHERE id = ?', (new_expiry, doc_id))
            conn.commit()
            conn.close()
            print(f"   ✓ 过期日期已设置为: {new_expiry}")
            
            print("\n3. 执行过期文档扫描...")
            dms.lifecycle.scan_expiring_documents()
            
            print("\n4. 模拟文档已过期（修改过期日期为昨天...")
            conn = get_connection()
            cursor = conn.cursor()
            old_expiry = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute('UPDATE documents SET expiry_date = ?, status = ? WHERE id = ?', 
                         (old_expiry, 'published', doc_id))
            conn.commit()
            conn.close()
            
            print("\n5. 执行过期文档下架...")
            dms.lifecycle.take_down_expired_documents()
            
            doc_info = dms.uploader.get_document_info(doc_id)
            if doc_info:
                print(f"   ✓ 文档状态: {doc_info['status']}")
    
    print("\n" + "="*70)
    print("过期管理测试完成！")
    print("="*70)

def main():
    parser = argparse.ArgumentParser(description='企业知识文档审核与发布管理系统')
    parser.add_argument('--demo', action='store_true', help='运行完整演示程序')
    parser.add_argument('--daily', action='store_true', help='执行每日定时任务')
    parser.add_argument('--weekly', action='store_true', help='生成周报告')
    parser.add_argument('--scheduler', action='store_true', help='调度器功能演示')
    parser.add_argument('--test-pdf', action='store_true', help='测试PDF导出功能')
    parser.add_argument('--test-expiry', action='store_true', help='测试过期管理功能')
    parser.add_argument('--test-all', action='store_true', help='运行所有功能测试')
    parser.add_argument('--scheduler-start', action='store_true', help='启动定时调度器')
    parser.add_argument('--scheduler-test', action='store_true', help='测试调度器任务')
    parser.add_argument('--upload', nargs=4, metavar=('FILE', 'TITLE', 'TYPE', 'AUTHOR'),
                        help='上传文档: 文件路径 标题 类型 作者名')
    parser.add_argument('--query', nargs='*', help='查询文档，可选参数: title= author= status= type=')
    
    args = parser.parse_args()
    
    if args.demo:
        run_demo()
    elif args.daily:
        dms = DocumentManagementSystem()
        dms.run_daily_tasks()
    elif args.weekly:
        dms = DocumentManagementSystem()
        dms.generate_weekly_report(export_formats=['pdf', 'excel'])
    elif args.scheduler:
        run_scheduler_demo()
    elif args.test_pdf:
        test_pdf_export()
    elif args.test_expiry:
        test_expiry_management()
    elif args.test_all:
        run_demo()
        test_pdf_export()
        test_expiry_management()
        run_scheduler_demo()
    elif args.scheduler_start:
        from scheduler import run_scheduler
        run_scheduler()
    elif args.scheduler_test:
        from scheduler import test_all_jobs
        test_all_jobs()
    elif args.upload:
        dms = DocumentManagementSystem()
        file_path, title, doc_type, author_name = args.upload
        author_info = {
            'id': 'auto_001',
            'name': author_name,
            'email': f'{author_name}@company.com',
            'department': '未指定'
        }
        dms.upload_document(file_path, title, doc_type, author_info)
    elif args.query:
        dms = DocumentManagementSystem()
        kwargs = {}
        for arg in args.query:
            key, value = arg.split('=', 1)
            kwargs[key] = value
        dms.query_documents(**kwargs)
    else:
        parser.print_help()
        print("\n示例用法:")
        print("  python main.py --demo              # 运行完整演示程序")
        print("  python main.py --daily             # 执行每日任务")
        print("  python main.py --weekly            # 生成周报告并导出")
        print("  python main.py --scheduler           # 调度器功能演示")
        print("  python main.py --test-pdf            # 测试PDF导出")
        print("  python main.py --test-expiry         # 测试过期管理")
        print("  python main.py --test-all            # 运行所有功能测试")
        print("  python main.py --scheduler-start     # 启动定时调度器")
        print("  python main.py --scheduler-test      # 测试调度器任务")
        print("  python main.py --upload file.txt \"文档标题\" 技术文档 张三")
        print("  python main.py --query status=published author=张三")

if __name__ == '__main__':
    main()
