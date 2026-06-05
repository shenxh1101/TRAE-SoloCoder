from app.models import User, ClassificationEnum, RoleEnum

CLASSIFICATION_ACCESS = {
    RoleEnum.employee.value: [ClassificationEnum.public.value],
    RoleEnum.supervisor.value: [ClassificationEnum.public.value, ClassificationEnum.internal.value],
    RoleEnum.executive.value: [ClassificationEnum.public.value, ClassificationEnum.internal.value, ClassificationEnum.confidential.value],
    RoleEnum.admin.value: [ClassificationEnum.public.value, ClassificationEnum.internal.value, ClassificationEnum.confidential.value],
}


def can_access_classification(user: User, classification: str) -> bool:
    allowed = CLASSIFICATION_ACCESS.get(user.role, [])
    return classification in allowed


def is_frozen(user: User) -> bool:
    if user.frozen_until and user.frozen_until > __import__("datetime").datetime.utcnow():
        return True
    return False
