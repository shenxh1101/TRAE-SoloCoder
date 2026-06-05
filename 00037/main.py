import sys
import os
from datetime import date, timedelta
from tabulate import tabulate

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from models import init_db, SessionLocal, Customer, Receivable, Order
from modules import (
    CreditScoringEngine,
    OrderRiskController,
    FinancialStatementParser,
    ReceivableManager,
    CreditRiskReportGenerator,
    OperationLogManager,
    run_daily_credit_update,
    run_daily_collection_scan,
    run_monthly_report
)
from modules.api_client import DataSyncManager, run_mock_sync
from utils import format_currency


def init_database():
    print("正在初始化数据库...")
    init_db()
    print("数据库初始化完成！")


def create_sample_data():
    db = SessionLocal()

    print("\n正在创建示例数据...")

    customers_data = [
        {
            'customer_code': 'CUST001',
            'name': '北京华信科技有限公司',
            'contact_person': '张总',
            'phone': '13800138001',
            'email': 'zhang@huaxin.com',
            'address': '北京市海淀区中关村大街1号',
            'industry': '信息技术',
            'credit_score': 92.5,
            'credit_level': 'AAA',
            'registration_date': date.today() - timedelta(days=365 * 8)
        },
        {
            'customer_code': 'CUST002',
            'name': '上海盛达贸易有限公司',
            'contact_person': '李经理',
            'phone': '13800138002',
            'email': 'li@shengda.com',
            'address': '上海市浦东新区陆家嘴金融中心88号',
            'industry': '贸易批发',
            'credit_score': 78.0,
            'credit_level': 'A',
            'registration_date': date.today() - timedelta(days=365 * 3)
        },
        {
            'customer_code': 'CUST003',
            'name': '广州恒远制造有限公司',
            'contact_person': '王厂长',
            'phone': '13800138003',
            'email': 'wang@hengyuan.com',
            'address': '广州市天河区工业园区66号',
            'industry': '制造业',
            'credit_score': 65.0,
            'credit_level': 'BBB',
            'registration_date': date.today() - timedelta(days=365 * 5)
        },
        {
            'customer_code': 'CUST004',
            'name': '深圳创新电子有限公司',
            'contact_person': '赵总',
            'phone': '13800138004',
            'email': 'zhao@chuangxin.com',
            'address': '深圳市南山区科技园南区99号',
            'industry': '电子制造',
            'credit_score': 52.0,
            'credit_level': 'BB',
            'registration_date': date.today() - timedelta(days=365 * 2)
        },
        {
            'customer_code': 'CUST005',
            'name': '成都顺通物流有限公司',
            'contact_person': '刘经理',
            'phone': '13800138005',
            'email': 'liu@shuntong.com',
            'address': '成都市武侯区物流园区33号',
            'industry': '物流运输',
            'credit_score': 45.0,
            'credit_level': 'B',
            'registration_date': date.today() - timedelta(days=365 * 1.5)
        }
    ]

    for data in customers_data:
        existing = db.query(Customer).filter(Customer.customer_code == data['customer_code']).first()
        if not existing:
            multiplier = {'AAA': 3.0, 'AA': 2.5, 'A': 2.0, 'BBB': 1.5, 'BB': 1.0, 'B': 0.5, 'C': 0.1}[data['credit_level']]
            base_limit = 200000
            credit_limit = base_limit * multiplier
            customer = Customer(
                **data,
                credit_limit=credit_limit,
                available_credit=credit_limit
            )
            db.add(customer)
            db.flush()

            for i in range(8):
                order_date = date.today() - timedelta(days=30 * (i + 1))
                order_amount = 50000 + (i % 3) * 30000
                order = Order(
                    customer_id=customer.id,
                    order_number=f"ORD-SAMPLE-{data['customer_code']}-{i+1}",
                    order_date=order_date,
                    total_amount=order_amount,
                    credit_limit_at_time=credit_limit,
                    available_credit_at_time=credit_limit - order_amount,
                    exceeds_credit_limit=False,
                    approval_status='auto_approved',
                    order_status='completed'
                )
                db.add(order)
                db.flush()

                if i < 6:
                    inv_date = order_date
                    due_date = inv_date + timedelta(days=30)
                    paid = i < 4 or (i == 4 and data['credit_level'] in ['AAA', 'AA', 'A'])

                    days_overdue = max(0, (date.today() - due_date).days) if not paid else 0
                    status = 'paid' if paid else ('overdue' if days_overdue > 0 else 'normal')

                    receivable = Receivable(
                        customer_id=customer.id,
                        invoice_number=f"INV-SAMPLE-{data['customer_code']}-{i+1}",
                        invoice_date=inv_date,
                        due_date=due_date,
                        total_amount=order_amount,
                        paid_amount=order_amount if paid else 0,
                        remaining_amount=0 if paid else order_amount,
                        days_overdue=days_overdue if not paid else 0,
                        status=status
                    )
                    db.add(receivable)
                    db.flush()

            if data['credit_level'] in ['BB', 'B']:
                customer.current_balance = customer.credit_limit * 0.8
                customer.available_credit = customer.credit_limit - customer.current_balance

    db.commit()
    print(f"已创建 {len(customers_data)} 个示例客户，包含历史订单和应收账款数据")
    db.close()


def show_main_menu():
    print("\n" + "="*70)
    print("                    客户信用风险评估与订单风控管理系统")
    print("="*70)
    print("1. 查看客户信用状况")
    print("2. 创建订单 & 信用额度校验")
    print("3. 审批管理（待审批订单）")
    print("4. 上传财务报表 & 更新信用等级")
    print("5. 应收账款管理 & 催收策略")
    print("6. 生成信用风险报告")
    print("7. 操作日志查询 & 导出")
    print("8. CRM/财务系统数据同步")
    print("9. 生成模拟API数据（测试用）")
    print("10. 启动Web文件上传服务")
    print("11. 执行每日任务（信用评估+催收扫描）")
    print("12. 执行月度任务（生成月度报告）")
    print("13. 启动定时调度器（后台运行）")
    print("0. 退出系统")
    print("="*70)
    return input("请选择操作 (0-13): ").strip()


def view_customer_credit():
    db = SessionLocal()
    print("\n" + "-"*70)
    print("客户信用状况列表")
    print("-"*70)

    customers = db.query(Customer).filter(Customer.is_active == True).all()
    data = []
    for c in customers:
        data.append([
            c.customer_code,
            c.name,
            c.industry,
            f"{c.credit_score:.1f}",
            c.credit_level,
            format_currency(c.credit_limit),
            format_currency(c.current_balance),
            format_currency(c.available_credit)
        ])

    headers = ['客户编码', '客户名称', '行业', '信用评分', '信用等级', '信用额度', '当前余额', '可用额度']
    print(tabulate(data, headers=headers, tablefmt='grid'))
    print("-"*70)
    db.close()


def create_order_menu():
    controller = OrderRiskController()
    try:
        print("\n" + "-"*70)
        print("创建订单")
        print("-"*70)

        db = SessionLocal()
        customers = db.query(Customer).filter(Customer.is_active == True).all()
        print("可用客户列表:")
        for c in customers:
            print(f"  {c.id}. {c.name} (信用等级: {c.credit_level}, 可用额度: {format_currency(c.available_credit)})")

        try:
            customer_id = int(input("\n请输入客户ID: "))
            order_amount = float(input("请输入订单金额 (元): "))
        except ValueError:
            print("输入无效！")
            return

        check_result = controller.check_credit_limit(customer_id, order_amount)
        print(f"\n信用检查结果: {check_result['message']}")

        if check_result['valid']:
            confirm = input("是否创建订单？(y/n): ").strip().lower()
            if confirm == 'y':
                order = controller.create_order(customer_id, order_amount)
                print(f"\n订单创建成功！订单号: {order.order_number}")
                print(f"订单状态: {order.order_status}")
        else:
            print(f"超出额度: {format_currency(check_result['shortfall'])}")
            print(f"需要 {check_result['approval_level']} 级审批，审批人: {', '.join(check_result['approvers'])}")
            confirm = input("是否创建待审批订单？(y/n): ").strip().lower()
            if confirm == 'y':
                order = controller.create_order(customer_id, order_amount)
                print(f"\n订单已创建并冻结！订单号: {order.order_number}")
                print(f"当前状态: {order.order_status}")

        db.close()
    finally:
        controller.close()


def approval_menu():
    controller = OrderRiskController()
    try:
        print("\n" + "-"*70)
        print("待审批订单列表")
        print("-"*70)

        pending_orders = controller.get_pending_approvals()
        if not pending_orders:
            print("暂无待审批订单")
            return

        data = []
        for o in pending_orders:
            customer_name = o.customer.name if o.customer else '未知'
            data.append([
                o.id,
                o.order_number,
                customer_name,
                format_currency(o.total_amount),
                format_currency(o.available_credit_at_time),
                f"{o.approval_level}级",
                o.approval_status
            ])

        headers = ['ID', '订单号', '客户名称', '订单金额', '下单时可用额度', '审批等级', '状态']
        print(tabulate(data, headers=headers, tablefmt='grid'))

        try:
            order_id = int(input("\n请输入要审批的订单ID: "))
            approver_role = input("请输入审批人角色 (销售经理/财务主管/风控总监): ").strip()
            approver_name = input("请输入审批人姓名: ").strip()
            decision = input("请输入审批结果 (approved/rejected): ").strip().lower()
            notes = input("请输入审批意见 (可选): ").strip()
        except ValueError:
            print("输入无效！")
            return

        result = controller.approve_order(order_id, approver_role, approver_name, decision, notes)
        print(f"\n审批结果: {result['message']}")

    finally:
        controller.close()


def financial_report_menu():
    parser = FinancialStatementParser()
    try:
        print("\n" + "-"*70)
        print("财务报表上传 & 信用等级更新")
        print("-"*70)

        db = SessionLocal()
        customers = db.query(Customer).filter(Customer.is_active == True).all()
        print("可用客户列表:")
        for c in customers:
            print(f"  {c.id}. {c.name} (信用等级: {c.credit_level})")

        try:
            customer_id = int(input("\n请输入客户ID: "))
        except ValueError:
            print("输入无效！")
            return

        print("\n请选择财务数据录入方式:")
        print("1. 手动输入财务数据")
        print("2. 上传PDF文件")
        print("3. 上传Excel文件")
        choice = input("请选择 (1-3): ").strip()

        if choice == '1':
            print("\n请输入财务数据:")
            try:
                financial_data = {
                    'total_assets': float(input("总资产 (元): ")),
                    'total_liabilities': float(input("总负债 (元): ")),
                    'current_assets': float(input("流动资产 (元): ")),
                    'current_liabilities': float(input("流动负债 (元): ")),
                    'inventory': float(input("存货 (元): ") or 0),
                    'cash_and_equivalents': float(input("货币资金 (元): ") or 0),
                    'operating_cash_flow': float(input("经营活动现金流净额 (元): ") or 0),
                    'revenue': float(input("营业收入 (元): ") or 0),
                    'net_profit': float(input("净利润 (元): ") or 0),
                }
                report_period = input("报告期 (如 2024-Q4 或 2024-12): ").strip()
                uploaded_by = input("上传人姓名: ").strip() or 'system'
            except ValueError:
                print("输入无效！")
                return

            record, ratios, health_score = parser.manual_input(
                customer_id, financial_data, report_period, uploaded_by
            )

            print("\n" + "="*60)
            print("财务指标计算结果:")
            print("="*60)
            print(f"资产负债率: {ratios['asset_liability_ratio']*100:.2f}%")
            print(f"流动比率: {ratios['current_ratio']:.2f}")
            print(f"速动比率: {ratios['quick_ratio']:.2f}")
            print(f"现金流比率: {ratios['cash_flow_ratio']:.2f}")
            print(f"财务健康评分: {health_score:.1f}/100")
            print("="*60)

        else:
            file_path = input("请输入文件路径: ").strip()
            if not os.path.exists(file_path):
                print("文件不存在！")
                return

            try:
                result = parser.upload_financial_statement(customer_id, file_path)
                ratios = result['ratios']
                health_score = result['health_score']

                print("\n" + "="*60)
                print(f"财务报表解析成功 - 客户: {result['customer']}")
                print("="*60)
                print(f"资产负债率: {ratios['asset_liability_ratio']*100:.2f}%")
                print(f"流动比率: {ratios['current_ratio']:.2f}")
                print(f"速动比率: {ratios['quick_ratio']:.2f}")
                print(f"现金流比率: {ratios['cash_flow_ratio']:.2f}")
                print(f"财务健康评分: {health_score:.1f}/100")
                print("="*60)
            except Exception as e:
                print(f"文件解析失败: {e}")
                return

        scorer = CreditScoringEngine()
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        scorer.update_customer_credit(customer, reason='财务报表更新，重新评估信用')
        scorer.close()

        print(f"\n客户信用等级已更新为: {customer.credit_level} (评分: {customer.credit_score:.1f})")
        db.close()

    finally:
        parser.close()


def receivable_menu():
    manager = ReceivableManager()
    try:
        print("\n" + "-"*70)
        print("应收账款管理 & 催收策略")
        print("-"*70)

        print("1. 查看逾期账款汇总")
        print("2. 执行催收扫描（生成催收任务）")
        print("3. 查看待处理催收任务")
        print("4. 完成催收任务")
        print("5. 查看客户应收账款明细")
        choice = input("请选择操作 (1-5): ").strip()

        if choice == '1':
            summary = manager.get_overdue_summary()
            if not summary:
                print("当前无逾期账款")
            else:
                data = []
                for item in summary:
                    data.append([
                        item['overdue_period'],
                        item['count'],
                        format_currency(item['total_amount']),
                        item['customer_count'],
                        ', '.join(item['customers'][:3]) + ('...' if len(item['customers']) > 3 else '')
                    ])
                headers = ['逾期期间', '笔数', '金额', '涉及客户数', '客户名称']
                print(tabulate(data, headers=headers, tablefmt='grid'))

        elif choice == '2':
            tasks = manager.scan_overdue_receivables()
            print(f"\n已生成 {len(tasks)} 个催收任务")
            for task_info in tasks[:5]:
                task = task_info['task']
                customer = task_info['customer']
                rec = task_info['receivable']
                print(f"  - [{task.priority.upper()}] {customer}: "
                      f"逾期{rec.days_overdue}天, 金额{format_currency(rec.remaining_amount)} "
                      f"-> 销售:{task.assigned_to_sales}, 财务:{task.assigned_to_finance}")

        elif choice == '3':
            tasks = manager.get_pending_collection_tasks()
            if not tasks:
                print("暂无待处理催收任务")
            else:
                data = []
                for t in tasks:
                    customer_name = t.customer.name if t.customer else '未知'
                    data.append([
                        t.id,
                        t.priority.upper(),
                        customer_name,
                        t.task_type,
                        t.actions_required[:30] + '...' if len(t.actions_required) > 30 else t.actions_required,
                        t.assigned_to_sales,
                        t.assigned_to_finance,
                        t.created_at.strftime('%Y-%m-%d')
                    ])
                headers = ['ID', '优先级', '客户', '类型', '应执行措施', '销售负责人', '财务负责人', '创建时间']
                print(tabulate(data, headers=headers, tablefmt='grid'))

        elif choice == '4':
            try:
                task_id = int(input("请输入催收任务ID: "))
                notes = input("请输入完成备注 (可选): ").strip()
            except ValueError:
                print("输入无效！")
                return
            task = manager.complete_collection_task(task_id, notes)
            print(f"催收任务 {task_id} 已标记为完成")

        elif choice == '5':
            db = SessionLocal()
            customers = db.query(Customer).filter(Customer.is_active == True).all()
            for c in customers:
                print(f"  {c.id}. {c.name}")
            try:
                customer_id = int(input("请输入客户ID: ").strip())
            except ValueError:
                print("输入无效！")
                return

            receivables = manager.get_customer_receivables(customer_id)
            if not receivables:
                print("该客户暂无应收账款记录")
            else:
                data = []
                for r in receivables:
                    data.append([
                        r.invoice_number,
                        r.invoice_date.strftime('%Y-%m-%d'),
                        r.due_date.strftime('%Y-%m-%d'),
                        format_currency(r.total_amount),
                        format_currency(r.paid_amount),
                        format_currency(r.remaining_amount),
                        r.days_overdue,
                        r.status
                    ])
                headers = ['发票号', '开票日期', '到期日', '总金额', '已付金额', '待收金额', '逾期天数', '状态']
                print(tabulate(data, headers=headers, tablefmt='grid'))
            db.close()

    finally:
        manager.close()


def report_menu():
    generator = CreditRiskReportGenerator()
    try:
        print("\n" + "-"*70)
        print("生成信用风险报告")
        print("-"*70)

        print("1. 生成月度信用风险报告（PDF + Excel）")
        print("2. 查看当前统计数据")
        choice = input("请选择操作 (1-2): ").strip()

        if choice == '1':
            print("\n正在生成报告，请稍候...")
            report_paths, stats = generator.generate_monthly_report()

            print("\n" + "="*60)
            print(f"报告生成完成 - {stats['report_month']}")
            print("="*60)
            print(f"Excel报告: {report_paths['excel']}")
            if report_paths['pdf']:
                print(f"PDF报告: {report_paths['pdf']}")
            print("-"*60)
            print(f"客户总数: {stats['total_customers']}")
            print(f"坏账率: {stats['bad_debt_rate']*100:.2f}%")
            print(f"订单超限比例: {stats['over_limit_ratio']*100:.2f}%")
            print(f"逾期金额: {format_currency(stats['overdue_amount'])}")
            print("="*60)

        elif choice == '2':
            stats = generator.collect_statistics()
            print("\n" + "="*60)
            print(f"当前统计数据 - 统计到 {stats['report_month']}")
            print("="*60)
            print(f"客户总数: {stats['total_customers']}")
            print(f"应收账款总额: {format_currency(stats['total_receivables'])}")
            print(f"坏账金额: {format_currency(stats['bad_debt_amount'])}")
            print(f"坏账率: {stats['bad_debt_rate']*100:.2f}%")
            print("-"*60)
            print("客户等级分布:")
            for level, count in stats['level_distribution'].items():
                pct = count / stats['total_customers'] * 100 if stats['total_customers'] > 0 else 0
                print(f"  {level}: {count}户 ({pct:.1f}%)")
            print("-"*60)
            print("账龄分析:")
            for bucket, data in stats['aging_analysis'].items():
                pct = data['amount'] / stats['overdue_amount'] * 100 if stats['overdue_amount'] > 0 else 0
                print(f"  {bucket}: {data['count']}笔, {format_currency(data['amount'])} ({pct:.1f}%)")
            print("="*60)

    finally:
        generator.close()


def api_sync_menu():
    print("\n" + "-"*70)
    print("CRM/财务系统数据同步")
    print("-"*70)
    print("1. 同步CRM交易记录")
    print("2. 同步财务系统付款记录")
    print("3. 同步财务系统应收账款")
    print("4. 全量同步（CRM + 财务系统）")
    print("5. 查看API同步日志")
    choice = input("请选择操作 (1-5): ").strip()

    sync_manager = DataSyncManager()
    db = SessionLocal()

    try:
        if choice == '1':
            print("\n正在同步CRM交易记录...")
            result = sync_manager.sync_crm_only()
            if result.get('success', False):
                print(f"同步完成: 新增{result.get('inserted', 0)}条, 更新{result.get('updated', 0)}条")
            elif result.get('enabled', False) == False:
                print("CRM API未启用，请在配置中设置 CRM_ENABLED=true")
            else:
                print(f"同步失败: {result.get('error', '未知错误')}")

        elif choice == '2':
            print("\n正在同步财务系统付款记录...")
            result = sync_manager.sync_finance_only()
            pay_result = result.get('payments', {})
            if pay_result.get('success', False):
                print(f"付款记录同步完成: 更新{pay_result.get('updated', 0)}条")
            elif pay_result.get('enabled', False) == False:
                print("财务系统API未启用，请在配置中设置 FINANCE_ENABLED=true")
            else:
                print(f"同步失败: {pay_result.get('error', '未知错误')}")

        elif choice == '3':
            print("\n正在同步财务系统应收账款...")
            result = sync_manager.sync_finance_only()
            rec_result = result.get('receivables', {})
            if rec_result.get('success', False):
                print(f"应收账款同步完成: 新增{rec_result.get('inserted', 0)}条, 更新{rec_result.get('updated', 0)}条")
            elif rec_result.get('enabled', False) == False:
                print("财务系统API未启用，请在配置中设置 FINANCE_ENABLED=true")
            else:
                print(f"同步失败: {rec_result.get('error', '未知错误')}")

        elif choice == '4':
            print("\n正在执行全量同步...")
            result = sync_manager.sync_all()
            for key, value in result.items():
                if value.get('success', False):
                    print(f"  ✅ {key}: 成功")
                elif value.get('enabled', False) == False:
                    print(f"  ⏭️  {key}: API未启用，已跳过")
                else:
                    print(f"  ❌ {key}: 失败 - {value.get('error', '未知错误')}")

        elif choice == '5':
            from models.models import APISyncLog
            logs = db.query(APISyncLog).order_by(APISyncLog.created_at.desc()).limit(10).all()
            if not logs:
                print("暂无同步日志")
            else:
                data = []
                for log in logs:
                    data.append([
                        log.id,
                        log.sync_type,
                        log.data_source,
                        log.status,
                        log.records_synced,
                        log.sync_start_time.strftime('%Y-%m-%d %H:%M:%S') if log.sync_start_time else '-',
                        log.error_message or '-'
                    ])
                headers = ['ID', '同步类型', '数据源', '状态', '同步条数', '开始时间', '错误信息']
                print(tabulate(data, headers=headers, tablefmt='grid'))

    finally:
        db.close()


def mock_data_menu():
    print("\n" + "-"*70)
    print("生成模拟API数据（测试用）")
    print("-"*70)
    print("此功能用于在API未配置时生成测试数据")
    confirm = input("是否生成模拟数据并同步到系统？(y/n): ").strip().lower()

    if confirm == 'y':
        print("\n正在生成模拟数据...")
        run_mock_sync()
        print("\n模拟数据生成完成！")


def start_web_server():
    print("\n" + "="*60)
    print("启动Web文件上传服务")
    print("="*60)

    from config.settings import WEB_CONFIG
    print(f"\n服务将启动在: http://{WEB_CONFIG['host']}:{WEB_CONFIG['port']}")
    print(f"上传页面: http://{WEB_CONFIG['host']}:{WEB_CONFIG['port']}/")
    print("\n按 Ctrl+C 停止服务")
    print("\n" + "="*60 + "\n")

    try:
        from webapp import main as web_main
        web_main()
    except KeyboardInterrupt:
        print("\n\nWeb服务已停止")


def operation_log_menu():
    manager = OperationLogManager()
    try:
        print("\n" + "-"*70)
        print("操作日志查询 & 导出")
        print("-"*70)

        print("1. 查询所有日志")
        print("2. 按条件组合查询")
        print("3. 按操作类型统计")
        print("4. 查询客户操作历史")
        print("5. 导出查询结果")
        choice = input("请选择操作 (1-5): ").strip()

        if choice == '1':
            logs = manager.query_logs()
            manager.print_logs(logs)

        elif choice == '2':
            print("\n请输入查询条件（留空则不限制）:")
            criteria = {
                'operation_type': input("操作类型 (credit_adjustment/order_approval/collection_task/financial_report_upload/monthly_report): ").strip() or None,
                'customer_name': input("客户名称 (模糊匹配): ").strip() or None,
                'credit_level': input("信用等级 (AAA/AA/A/BBB/BB/B/C，多个用逗号分隔): ").strip() or None,
                'start_time': input("开始时间 (YYYY-MM-DD): ").strip() or None,
                'end_time': input("结束时间 (YYYY-MM-DD): ").strip() or None,
                'operator': input("操作人: ").strip() or None
            }
            if criteria['credit_level']:
                criteria['credit_level'] = [x.strip() for x in criteria['credit_level'].split(',')]

            logs = manager.advanced_search(criteria)
            manager.print_logs(logs)

            export = input("\n是否导出查询结果？(y/n): ").strip().lower()
            if export == 'y':
                output_path, count = manager.export_to_excel(logs)
                print(f"已导出 {count} 条日志到: {output_path}")

        elif choice == '3':
            stats = manager.get_operation_type_stats()
            print("\n" + "-"*50)
            print(f"{'操作类型':<30} {'数量':<10}")
            print("-"*50)
            for op_type, count in sorted(stats.items(), key=lambda x: -x[1]):
                print(f"{op_type:<30} {count:<10}")
            print("-"*50)

        elif choice == '4':
            db = SessionLocal()
            customers = db.query(Customer).filter(Customer.is_active == True).all()
            for c in customers:
                print(f"  {c.id}. {c.name}")
            try:
                customer_id = int(input("请输入客户ID: ").strip())
            except ValueError:
                print("输入无效！")
                return

            logs = manager.get_customer_operation_history(customer_id)
            manager.print_logs(logs)
            db.close()

        elif choice == '5':
            criteria = {}
            output_path, count = manager.batch_export(criteria)
            print(f"已导出全部 {count} 条日志到: {output_path}")

    finally:
        manager.close()


def main():
    init_database()

    db = SessionLocal()
    customer_count = db.query(Customer).count()
    db.close()

    if customer_count == 0:
        create_sample_data()

    while True:
        choice = show_main_menu()

        if choice == '1':
            view_customer_credit()
        elif choice == '2':
            create_order_menu()
        elif choice == '3':
            approval_menu()
        elif choice == '4':
            financial_report_menu()
        elif choice == '5':
            receivable_menu()
        elif choice == '6':
            report_menu()
        elif choice == '7':
            operation_log_menu()
        elif choice == '8':
            api_sync_menu()
        elif choice == '9':
            mock_data_menu()
        elif choice == '10':
            start_web_server()
        elif choice == '11':
            print("\n执行每日任务...")
            run_daily_credit_update()
            run_daily_collection_scan()
        elif choice == '12':
            print("\n执行月度任务...")
            run_monthly_report()
        elif choice == '13':
            print("\n启动定时调度器...")
            from modules.scheduler import start_scheduler
            start_scheduler()
        elif choice == '0':
            print("\n感谢使用，再见！")
            break
        else:
            print("\n无效选择，请重新输入！")

        input("\n按 Enter 键继续...")


if __name__ == '__main__':
    main()
