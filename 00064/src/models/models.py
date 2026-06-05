from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date
from .database import Base


class Employee(Base):
    __tablename__ = 'employees'

    id = Column(Integer, primary_key=True)
    employee_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    position = Column(String(100), nullable=False)
    level = Column(String(50))
    email = Column(String(100))
    phone = Column(String(20))
    supervisor_id = Column(String(50))
    skills = Column(Text, default='')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    enrollments = relationship('Enrollment', back_populates='employee')
    exam_records = relationship('ExamRecord', back_populates='employee')
    certificates = relationship('Certificate', back_populates='employee')
    learning_records = relationship('LearningRecord', back_populates='employee')


class CompetencyModel(Base):
    __tablename__ = 'competency_models'

    id = Column(Integer, primary_key=True)
    position = Column(String(100), nullable=False)
    level = Column(String(50), nullable=False)
    required_skills = Column(Text, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    def get_required_skills_list(self):
        return [s.strip() for s in self.required_skills.split(',') if s.strip()]


class Course(Base):
    __tablename__ = 'courses'

    id = Column(Integer, primary_key=True)
    course_code = Column(String(50), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    difficulty_level = Column(String(50), default='中级')
    target_skills = Column(Text, default='')
    duration_hours = Column(Float, default=0)
    instructor = Column(String(100))
    content_path = Column(String(500))
    content_text = Column(Text)
    created_by = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    training_plans = relationship('TrainingPlan', back_populates='course')
    questions = relationship('Question', back_populates='course')

    def get_target_skills_list(self):
        return [s.strip() for s in self.target_skills.split(',') if s.strip()]


class Question(Base):
    __tablename__ = 'questions'

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False)
    question_type = Column(String(50), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(Text)
    correct_answer = Column(Text, nullable=False)
    points = Column(Integer, default=10)
    difficulty = Column(String(50), default='medium')
    created_at = Column(DateTime, default=datetime.now)

    course = relationship('Course', back_populates='questions')

    def get_options_list(self):
        if self.options:
            return [opt.strip() for opt in self.options.split('|||') if opt.strip()]
        return []


class TrainingPlan(Base):
    __tablename__ = 'training_plans'

    id = Column(Integer, primary_key=True)
    plan_code = Column(String(50), unique=True, nullable=False)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    location = Column(String(200))
    max_participants = Column(Integer, default=30)
    current_participants = Column(Integer, default=0)
    status = Column(String(50), default='pending')
    generated_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.now)

    course = relationship('Course', back_populates='training_plans')
    enrollments = relationship('Enrollment', back_populates='training_plan')
    waitlist = relationship('Waitlist', back_populates='training_plan')
    learning_records = relationship('LearningRecord', back_populates='training_plan')
    exams = relationship('Exam', back_populates='training_plan')


class Enrollment(Base):
    __tablename__ = 'enrollments'

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    training_plan_id = Column(Integer, ForeignKey('training_plans.id'), nullable=False)
    status = Column(String(50), default='registered')
    registered_at = Column(DateTime, default=datetime.now)
    cancelled_at = Column(DateTime)
    cancel_reason = Column(String(500))
    total_study_hours = Column(Float, default=0)
    is_active = Column(Boolean, default=True)
    engagement_status = Column(String(50), default='normal')
    warning_count = Column(Integer, default=0)
    last_warning_at = Column(DateTime)

    employee = relationship('Employee', back_populates='enrollments')
    training_plan = relationship('TrainingPlan', back_populates='enrollments')


class Waitlist(Base):
    __tablename__ = 'waitlist'

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    training_plan_id = Column(Integer, ForeignKey('training_plans.id'), nullable=False)
    priority = Column(Integer, default=1)
    added_at = Column(DateTime, default=datetime.now)
    status = Column(String(50), default='waiting')
    promoted_at = Column(DateTime)

    employee = relationship('Employee')
    training_plan = relationship('TrainingPlan', back_populates='waitlist')


class LearningRecord(Base):
    __tablename__ = 'learning_records'

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    training_plan_id = Column(Integer, ForeignKey('training_plans.id'), nullable=False)
    record_time = Column(DateTime, default=datetime.now)
    study_duration_minutes = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    notes = Column(Text)

    employee = relationship('Employee', back_populates='learning_records')
    training_plan = relationship('TrainingPlan', back_populates='learning_records')


class Exam(Base):
    __tablename__ = 'exams'

    id = Column(Integer, primary_key=True)
    exam_code = Column(String(50), unique=True, nullable=False)
    training_plan_id = Column(Integer, ForeignKey('training_plans.id'), nullable=False)
    title = Column(String(200), nullable=False)
    duration_minutes = Column(Integer, default=60)
    passing_score = Column(Integer, default=60)
    total_questions = Column(Integer, default=10)
    total_points = Column(Integer, default=100)
    status = Column(String(50), default='created')
    created_at = Column(DateTime, default=datetime.now)

    training_plan = relationship('TrainingPlan', back_populates='exams')
    exam_records = relationship('ExamRecord', back_populates='exam')
    exam_questions = relationship('ExamQuestion', back_populates='exam')


class ExamQuestion(Base):
    __tablename__ = 'exam_questions'

    id = Column(Integer, primary_key=True)
    exam_id = Column(Integer, ForeignKey('exams.id'), nullable=False)
    question_id = Column(Integer, ForeignKey('questions.id'), nullable=False)
    question_order = Column(Integer, nullable=False)

    exam = relationship('Exam', back_populates='exam_questions')
    question = relationship('Question')


class ExamRecord(Base):
    __tablename__ = 'exam_records'

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    exam_id = Column(Integer, ForeignKey('exams.id'), nullable=False)
    attempt_number = Column(Integer, default=1)
    answers = Column(Text)
    score = Column(Float)
    is_passed = Column(Boolean, default=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    status = Column(String(50), default='pending')
    next_attempt_date = Column(Date)
    feedback = Column(Text)

    employee = relationship('Employee', back_populates='exam_records')
    exam = relationship('Exam', back_populates='exam_records')


class Certificate(Base):
    __tablename__ = 'certificates'

    id = Column(Integer, primary_key=True)
    certificate_code = Column(String(100), unique=True, nullable=False)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False)
    exam_record_id = Column(Integer, ForeignKey('exam_records.id'))
    certificate_title = Column(String(200), nullable=False)
    issued_date = Column(Date, default=date.today)
    valid_until = Column(Date)
    certificate_path = Column(String(500))
    status = Column(String(50), default='active')
    created_at = Column(DateTime, default=datetime.now)

    employee = relationship('Employee', back_populates='certificates')
    course = relationship('Course')
    exam_record = relationship('ExamRecord')


class WarningNotification(Base):
    __tablename__ = 'warning_notifications'

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    training_plan_id = Column(Integer, ForeignKey('training_plans.id'), nullable=False)
    warning_type = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    supervisor_id = Column(String(50))
    sent_at = Column(DateTime, default=datetime.now)
    is_read = Column(Boolean, default=False)

    employee = relationship('Employee')
    training_plan = relationship('TrainingPlan')


class OperationLog(Base):
    __tablename__ = 'operation_logs'

    id = Column(Integer, primary_key=True)
    operator = Column(String(100), nullable=False)
    operation = Column(String(200), nullable=False)
    target_type = Column(String(50))
    target_id = Column(Integer)
    details = Column(Text)
    ip_address = Column(String(50))
    created_at = Column(DateTime, default=datetime.now)


class Report(Base):
    __tablename__ = 'reports'

    id = Column(Integer, primary_key=True)
    report_code = Column(String(50), unique=True, nullable=False)
    report_type = Column(String(50), nullable=False)
    period = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    completion_rate = Column(Float, default=0)
    average_score = Column(Float, default=0)
    participation_rate = Column(Float, default=0)
    total_training_hours = Column(Float, default=0)
    total_participants = Column(Integer, default=0)
    pdf_path = Column(String(500))
    excel_path = Column(String(500))
    created_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.now)
