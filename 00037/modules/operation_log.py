import sys
import os
from datetime import datetime, date
from typing import Optional, List
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import SessionLocal, OperationLog
from config.settings import REPORTS_DIR
from utils import parse_date


class OperationLogManager:
    def __init__(self):
        self.db = SessionLocal()

    def query_logs(self,
                   operation_type: Optional[str] = None,
                   customer_name: Optional[str] = None,
                   credit_level: Optional[str] = None,
                   start_time: Optional[date] = None,
                   end_time: Optional[date] = None,
                   operator: Optional[str] = None,
                   order_id: Optional[int] = None,
                   customer_id: Optional[int] = None) -> List[OperationLog]:

        query = self.db.query(OperationLog)

        if operation_type:
            query = query.filter(OperationLog.operation_type == operation_type)
        if customer_name:
            query = query.filter(OperationLog.customer_name.like(f"%{customer_name}%"))
        if credit_level:
            if isinstance(credit_level, list):
                query = query.filter(OperationLog.credit_level.in_(credit_level))
            else:
                query = query.filter(OperationLog.credit_level == credit_level)
        if start_time:
            query = query.filter(OperationLog.operation_time >= start_time)
        if end_time:
            query = query.filter(OperationLog.operation_time <= end_time)
        if operator:
            query = query.filter(OperationLog.operator == operator)
        if order_id:
            query = query.filter(OperationLog.order_id == order_id)
        if customer_id:
            query = query.filter(OperationLog.customer_id == customer_id)

        return query.order_by(OperationLog.operation_time.desc()).all()

    def export_to_excel(self, logs, output_path=None):
        if output_path is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_path = os.path.join(REPORTS_DIR, f'操作日志_{timestamp}.xlsx')

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        data = []
        for log in logs:
            data.append({
                '日志ID': log.id,
                '操作类型': log.operation_type,
                '客户ID': log.customer_id if log.customer_id else '',
                '客户名称': log.customer_name if log.customer_name else '',
                '信用等级': log.credit_level if log.credit_level else '',
                '订单ID': log.order_id if log.order_id else '',
                '操作详情': log.operation_details,
                '操作人': log.operator,
                '操作时间': log.operation_time.strftime('%Y-%m-%d %H:%M:%S') if log.operation_time else '',
                'IP地址': log.ip_address if log.ip_address else ''
            })

        df = pd.DataFrame(data)

        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='操作日志', index=False)

            for sheet in writer.sheets.values():
                for column in sheet.columns:
                    max_length = 0
                    column_name = column[0].column_letter
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    sheet.column_dimensions[column_name].width = min(max_length + 2, 60)

        return output_path, len(data)

    def get_operation_type_stats(self, start_time=None, end_time=None):
        query = self.db.query(OperationLog)
        if start_time:
            query = query.filter(OperationLog.operation_time >= start_time)
        if end_time:
            query = query.filter(OperationLog.operation_time <= end_time)

        logs = query.all()
        stats = {}
        for log in logs:
            stats[log.operation_type] = stats.get(log.operation_type, 0) + 1
        return stats

    def get_customer_operation_history(self, customer_id, limit=100):
        return self.db.query(OperationLog).filter(
            OperationLog.customer_id == customer_id
        ).order_by(OperationLog.operation_time.desc()).limit(limit).all()

    def get_order_operation_history(self, order_id):
        return self.db.query(OperationLog).filter(
            OperationLog.order_id == order_id
        ).order_by(OperationLog.operation_time.desc()).all()

    def advanced_search(self, criteria):
        operation_type = criteria.get('operation_type')
        customer_name = criteria.get('customer_name')
        credit_level = criteria.get('credit_level')
        start_time_str = criteria.get('start_time')
        end_time_str = criteria.get('end_time')
        operator = criteria.get('operator')

        start_time = parse_date(start_time_str) if start_time_str else None
        end_time = parse_date(end_time_str) if end_time_str else None

        logs = self.query_logs(
            operation_type=operation_type,
            customer_name=customer_name,
            credit_level=credit_level,
            start_time=start_time,
            end_time=end_time,
            operator=operator
        )

        return logs

    def batch_export(self, criteria, output_path=None):
        logs = self.advanced_search(criteria)
        return self.export_to_excel(logs, output_path)

    def print_logs(self, logs, limit=50):
        if not logs:
            print("未找到符合条件的操作日志")
            return

        print(f"\n找到 {len(logs)} 条操作日志，显示前{min(limit, len(logs))}条:")
        print("=" * 120)
        print(f"{'ID':<6} {'操作类型':<20} {'客户名称':<15} {'信用等级':<8} {'操作人':<12} {'操作时间':<20}")
        print("-" * 120)

        for i, log in enumerate(logs[:limit]):
            print(f"{log.id:<6} {log.operation_type:<20} {(log.customer_name or '-')[:14]:<15} "
                  f"{(log.credit_level or '-'):<8} {(log.operator or '-'):<12} "
                  f"{log.operation_time.strftime('%Y-%m-%d %H:%M:%S'):<20}")
            if log.operation_details:
                print(f"       详情: {log.operation_details[:100]}...")

        print("=" * 120)

    def close(self):
        self.db.close()


def demo_log_query():
    manager = OperationLogManager()
    try:
        print("\n" + "="*80)
        print("操作日志查询演示")
        print("="*80)

        print("\n1. 查询所有操作日志:")
        all_logs = manager.query_logs()
        manager.print_logs(all_logs, limit=10)

        print("\n2. 按操作类型查询（信用调整）:")
        credit_logs = manager.query_logs(operation_type='credit_adjustment')
        manager.print_logs(credit_logs, limit=10)

        print("\n3. 按信用等级查询（低等级客户）:")
        low_level_logs = manager.query_logs(credit_level=['B', 'C', 'BB'])
        manager.print_logs(low_level_logs, limit=10)

        print("\n4. 组合条件查询（近30天订单审批）:")
        from datetime import timedelta
        start_date = date.today() - timedelta(days=30)
        combined_logs = manager.query_logs(
            operation_type='order_approval',
            start_time=start_date
        )
        manager.print_logs(combined_logs, limit=10)

        print("\n5. 高级搜索并导出:")
        criteria = {
            'operation_type': 'collection_task',
            'credit_level': ['BB', 'B', 'C']
        }
        export_path, count = manager.batch_export(criteria)
        print(f"   已导出 {count} 条日志到: {export_path}")

        print("\n6. 操作类型统计:")
        stats = manager.get_operation_type_stats()
        print("   " + "-"*40)
        print(f"   {'操作类型':<25} {'数量':<10}")
        print("   " + "-"*40)
        for op_type, count in sorted(stats.items(), key=lambda x: -x[1]):
            print(f"   {op_type:<25} {count:<10}")
        print("   " + "-"*40)

        return True
    finally:
        manager.close()
