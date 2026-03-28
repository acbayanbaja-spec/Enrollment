"""
Create in-app notifications for users.
"""
from sqlalchemy.orm import Session

from app.models import Notification, Role, User


def notify_user(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    notification_type: str = "info",
    related_enrollment_id: int | None = None,
) -> Notification:
    n = Notification(
        user_id=user_id,
        title=title,
        body=body,
        notification_type=notification_type,
        related_enrollment_id=related_enrollment_id,
    )
    db.add(n)
    return n


def notify_role_users(db: Session, role_name: str, title: str, body: str, **kwargs) -> None:
    users = db.query(User).join(Role, User.role_id == Role.id).filter(Role.name == role_name).all()
    for u in users:
        notify_user(db, u.id, title, body, **kwargs)
