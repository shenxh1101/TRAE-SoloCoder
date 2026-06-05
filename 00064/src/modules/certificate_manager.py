import os
from datetime import datetime, date, timedelta
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER
from src.models.models import (
    Employee, Course, Certificate, ExamRecord, TrainingPlan
)
from src.models.database import SessionLocal
from src.utils.common import generate_code, BASE_DIR
from src.utils.logger import log_operation, log_info, log_error
from src.modules.course_processor import CourseProcessor


class CertificateManager:
    def __init__(self, db: Optional[Session] = None):
        self.db = db or SessionLocal()
        self.cert_dir = os.path.join(BASE_DIR, 'exports', 'certificates')
        os.makedirs(self.cert_dir, exist_ok=True)
        self.course_processor = CourseProcessor(self.db)

    def generate_certificate(self, employee_id: int, course_id: int,
                             exam_record_id: int, operator: str) -> Tuple[Optional[Certificate], str]:
        try:
            employee = self.db.query(Employee).filter(Employee.id == employee_id).first()
            course = self.db.query(Course).filter(Course.id == course_id).first()
            exam_record = self.db.query(ExamRecord).filter(ExamRecord.id == exam_record_id).first()

            if not employee or not course or not exam_record:
                return None, "员工、课程或考试记录不存在"

            if not exam_record.is_passed:
                return None, "考试未通过，无法颁发证书"

            existing_cert = self.db.query(Certificate).filter(
                Certificate.employee_id == employee_id,
                Certificate.course_id == course_id,
                Certificate.status == 'active'
            ).first()

            if existing_cert:
                return existing_cert, "该员工已拥有此课程的有效证书"

            cert_code = generate_code('CERT_')
            cert_title = f"{course.title} - 培训结业证书"

            cert = Certificate(
                certificate_code=cert_code,
                employee_id=employee_id,
                course_id=course_id,
                exam_record_id=exam_record_id,
                certificate_title=cert_title,
                issued_date=date.today(),
                valid_until=date.today() + timedelta(days=365 * 3),
                status='active'
            )

            self.db.add(cert)
            self.db.flush()

            cert_path = self._create_certificate_pdf(cert, employee, course, exam_record)
            cert.certificate_path = cert_path

            self._update_employee_skills(employee, course)

            advanced_courses = self.course_processor.recommend_advanced_courses(employee_id, top_n=3)

            self.db.commit()

            log_operation(operator, '颁发证书', 'Certificate', cert.id,
                          f"员工: {employee.name}, 课程: {course.title}")

            return cert, f"证书颁发成功，已推荐{len(advanced_courses)}门进阶课程"

        except Exception as e:
            self.db.rollback()
            log_error("颁发证书失败", e)
            return None, f"颁发失败: {str(e)}"

    def _create_certificate_pdf(self, cert: Certificate, employee: Employee,
                                course: Course, exam_record: ExamRecord) -> str:
        try:
            file_name = f"{cert.certificate_code}.pdf"
            file_path = os.path.join(self.cert_dir, file_name)

            doc = SimpleDocTemplate(
                file_path,
                pagesize=A4,
                rightMargin=0.5 * inch,
                leftMargin=0.5 * inch,
                topMargin=0.5 * inch,
                bottomMargin=0.5 * inch
            )

            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'CertificateTitle',
                parent=styles['Title'],
                fontSize=28,
                textColor=colors.darkblue,
                alignment=TA_CENTER,
                spaceAfter=30
            )
            subtitle_style = ParagraphStyle(
                'Subtitle',
                parent=styles['Heading2'],
                fontSize=18,
                textColor=colors.grey,
                alignment=TA_CENTER,
                spaceAfter=20
            )
            normal_style = ParagraphStyle(
                'NormalCenter',
                parent=styles['Normal'],
                fontSize=14,
                alignment=TA_CENTER,
                spaceAfter=15,
                leading=20
            )
            name_style = ParagraphStyle(
                'NameStyle',
                parent=styles['Title'],
                fontSize=22,
                textColor=colors.darkred,
                alignment=TA_CENTER,
                spaceAfter=10
            )

            story = []

            story.append(Paragraph("培训结业证书", title_style))
            story.append(Paragraph("CERTIFICATE OF COMPLETION", subtitle_style))
            story.append(Spacer(1, 0.5 * inch))

            story.append(Paragraph("兹证明", normal_style))
            story.append(Paragraph(employee.name, name_style))
            story.append(Spacer(1, 0.2 * inch))

            story.append(Paragraph(
                f"（工号：{employee.employee_id}，部门：{employee.department}）",
                normal_style
            ))
            story.append(Spacer(1, 0.3 * inch))

            story.append(Paragraph("已完成以下培训课程并通过考核：", normal_style))
            story.append(Paragraph(f"<b>{course.title}</b>", ParagraphStyle(
                'CourseTitle',
                parent=styles['Heading2'],
                fontSize=18,
                textColor=colors.darkgreen,
                alignment=TA_CENTER,
                spaceAfter=15
            )))
            story.append(Spacer(1, 0.2 * inch))

            story.append(Paragraph(
                f"考试成绩：<b>{exam_record.score:.2f} 分</b>，"
                f"培训学时：<b>{course.duration_hours:.1f} 学时</b>",
                normal_style
            ))
            story.append(Spacer(1, 0.3 * inch))

            data = [
                ['证书编号:', cert.certificate_code],
                ['颁发日期:', cert.issued_date.strftime('%Y年%m月%d日')],
                ['有效期至:', cert.valid_until.strftime('%Y年%m月%d日')],
                ['讲师:', course.instructor or '—']
            ]
            table = Table(data, colWidths=[1.5 * inch, 4 * inch])
            table.setStyle(TableStyle([
                ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 12),
                ('FONT', (1, 0), (1, -1), 'Helvetica', 12),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(table)
            story.append(Spacer(1, 0.5 * inch))

            story.append(Paragraph(
                "颁发机构：企业培训管理系统",
                ParagraphStyle('Footer', parent=styles['Normal'], fontSize=10, alignment=TA_CENTER)
            ))

            doc.build(story)
            return file_path

        except Exception as e:
            log_error("生成证书PDF失败", e)
            return ""

    def _update_employee_skills(self, employee: Employee, course: Course) -> None:
        try:
            current_skills = set([s.strip() for s in (employee.skills or '').split(',') if s.strip()])
            course_skills = set(course.get_target_skills_list())

            new_skills = course_skills - current_skills
            if new_skills:
                all_skills = list(current_skills | new_skills)
                employee.skills = ','.join(all_skills)
                employee.updated_at = datetime.now()

                log_info(f"更新员工技能: {employee.name}, 新增技能: {', '.join(new_skills)}")

        except Exception as e:
            log_error("更新员工技能失败", e)

    def auto_issue_certificates(self, operator: str) -> List[Dict]:
        try:
            passed_records = self.db.query(ExamRecord).filter(
                ExamRecord.is_passed == True,
                ExamRecord.status == 'completed'
            ).all()

            results = []
            for record in passed_records:
                existing_cert = self.db.query(Certificate).filter(
                    Certificate.employee_id == record.employee_id,
                    Certificate.exam_record_id == record.id
                ).first()

                if not existing_cert:
                    exam = record.exam
                    plan = exam.training_plan
                    cert, msg = self.generate_certificate(
                        record.employee_id, plan.course_id, record.id, operator
                    )
                    employee = self.db.query(Employee).filter(Employee.id == record.employee_id).first()
                    results.append({
                        'employee_name': employee.name if employee else '未知',
                        'course_title': plan.course.title if plan else '未知课程',
                        'certificate_id': cert.id if cert else None,
                        'success': cert is not None,
                        'message': msg
                    })

            return results

        except Exception as e:
            log_error("自动颁发证书失败", e)
            return []

    def get_employee_certificates(self, employee_id: int) -> List[Dict]:
        try:
            certs = self.db.query(Certificate).filter(
                Certificate.employee_id == employee_id
            ).order_by(Certificate.issued_date.desc()).all()

            result = []
            for cert in certs:
                course = self.db.query(Course).filter(Course.id == cert.course_id).first()
                result.append({
                    'certificate_id': cert.id,
                    'certificate_code': cert.certificate_code,
                    'certificate_title': cert.certificate_title,
                    'course_title': course.title if course else '未知课程',
                    'course_id': cert.course_id,
                    'issued_date': cert.issued_date,
                    'valid_until': cert.valid_until,
                    'certificate_path': cert.certificate_path,
                    'status': cert.status,
                    'is_expired': cert.valid_until < date.today() if cert.valid_until else False
                })

            return result

        except Exception as e:
            log_error("获取员工证书失败", e)
            return []

    def verify_certificate(self, certificate_code: str) -> Dict:
        try:
            cert = self.db.query(Certificate).filter(
                Certificate.certificate_code == certificate_code
            ).first()

            if not cert:
                return {'valid': False, 'message': '证书不存在'}

            employee = self.db.query(Employee).filter(Employee.id == cert.employee_id).first()
            course = self.db.query(Course).filter(Course.id == cert.course_id).first()
            exam_record = self.db.query(ExamRecord).filter(ExamRecord.id == cert.exam_record_id).first()

            is_expired = cert.valid_until < date.today() if cert.valid_until else False
            is_valid = cert.status == 'active' and not is_expired

            return {
                'valid': is_valid,
                'certificate_code': cert.certificate_code,
                'certificate_title': cert.certificate_title,
                'employee_name': employee.name if employee else '未知',
                'employee_code': employee.employee_id if employee else '',
                'course_title': course.title if course else '未知',
                'score': exam_record.score if exam_record else 0,
                'issued_date': cert.issued_date,
                'valid_until': cert.valid_until,
                'is_expired': is_expired,
                'status': cert.status,
                'message': '证书有效' if is_valid else ('证书已过期' if is_expired else '证书已失效')
            }

        except Exception as e:
            log_error("验证证书失败", e)
            return {'valid': False, 'message': '验证失败'}

    def get_certificate_statistics(self, start_date: Optional[date] = None,
                                   end_date: Optional[date] = None) -> Dict:
        try:
            query = self.db.query(Certificate)
            if start_date:
                query = query.filter(Certificate.issued_date >= start_date)
            if end_date:
                query = query.filter(Certificate.issued_date <= end_date)

            certs = query.all()

            total_issued = len(certs)
            active_count = sum(1 for c in certs if c.status == 'active')
            expired_count = sum(1 for c in certs if c.valid_until and c.valid_until < date.today())

            course_counts = {}
            for cert in certs:
                course = self.db.query(Course).filter(Course.id == cert.course_id).first()
                if course:
                    course_title = course.title
                    course_counts[course_title] = course_counts.get(course_title, 0) + 1

            dept_counts = {}
            for cert in certs:
                employee = self.db.query(Employee).filter(Employee.id == cert.employee_id).first()
                if employee:
                    dept = employee.department
                    dept_counts[dept] = dept_counts.get(dept, 0) + 1

            return {
                'total_issued': total_issued,
                'active_count': active_count,
                'expired_count': expired_count,
                'by_course': course_counts,
                'by_department': dept_counts
            }

        except Exception as e:
            log_error("获取证书统计失败", e)
            return {}

    def revoke_certificate(self, certificate_id: int, operator: str, reason: str = '') -> Tuple[bool, str]:
        try:
            cert = self.db.query(Certificate).filter(Certificate.id == certificate_id).first()
            if not cert:
                return False, "证书不存在"

            cert.status = 'revoked'
            self.db.commit()

            log_operation(operator, '吊销证书', 'Certificate', certificate_id,
                          f"原因: {reason}")

            return True, "证书已吊销"

        except Exception as e:
            self.db.rollback()
            log_error("吊销证书失败", e)
            return False, f"吊销失败: {str(e)}"

    def close(self):
        self.db.close()
        self.course_processor.close()
