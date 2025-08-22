from app.db.models import User, Dream, Comment, Tag
from sqlalchemy.orm import Session
from sqlalchemy import or_


class UserRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_email(self, email: str):
        return self.session.query(User).filter(User.email == email).first()

    def get_by_id(self, user_id: int):
        return self.session.query(User).filter(User.id == user_id).first()

    def get_by_ids(self, ids: list[int]):
        if not ids:
            return []
        return self.session.query(User).filter(User.id.in_(ids)).all()

    def create(self, user: User):
        self.session.add(user)
        self.session.commit()
        return user

    def delete(self, user: User):
        self.session.delete(user)
        self.session.commit()


class DreamRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, dream: Dream):
        self.session.add(dream)
        self.session.commit()
        return dream

    def delete(self, dream: Dream):
        self.session.delete(dream)
        self.session.commit()

    def get_all(self):
        return self.session.query(Dream).order_by(Dream.created_at.desc()).all()

    def get(self, dream_id: int):
        return self.session.query(Dream).filter(Dream.id == dream_id).first()

    def search_like(self, q: str):
        pattern = f"%{q}%"
        return (
            self.session.query(Dream)
            .outerjoin(Dream.tags)
            .filter(
                or_(
                    Dream.content.ilike(pattern),
                    Dream.summary.ilike(pattern),
                    Tag.name.ilike(pattern),
                )
            )
            .distinct()
            .order_by(Dream.created_at.desc())
            .all()
        )

    def count_all(self) -> int:
        return self.session.query(Dream).count()

    def count_like(self, q: str) -> int:
        pattern = f"%{q}%"
        return (
            self.session.query(Dream.id)
            .outerjoin(Dream.tags)
            .filter(
                or_(
                    Dream.content.ilike(pattern),
                    Dream.summary.ilike(pattern),
                    Tag.name.ilike(pattern),
                )
            )
            .distinct()
            .count()
        )

    def get_page(self, page: int, limit: int):
        offset = max(0, (page - 1) * max(1, limit))
        return (
            self.session.query(Dream)
            .order_by(Dream.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def search_like_page(self, q: str, page: int, limit: int):
        pattern = f"%{q}%"
        offset = max(0, (page - 1) * max(1, limit))
        return (
            self.session.query(Dream)
            .outerjoin(Dream.tags)
            .filter(
                or_(
                    Dream.content.ilike(pattern),
                    Dream.summary.ilike(pattern),
                    Tag.name.ilike(pattern),
                )
            )
            .distinct()
            .order_by(Dream.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count_advanced(self, q: str | None, tags: list[str] | None) -> int:
        query = self.session.query(Dream.id).outerjoin(Dream.tags)
        if q and q.strip():
            pattern = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    Dream.content.ilike(pattern),
                    Dream.summary.ilike(pattern),
                    Tag.name.ilike(pattern),
                )
            )
        if tags:
            query = query.filter(Tag.name.in_(tags))
        return query.distinct().count()

    def search_advanced_page(
        self, q: str | None, tags: list[str] | None, page: int, limit: int
    ):
        offset = max(0, (page - 1) * max(1, limit))
        query = self.session.query(Dream).outerjoin(Dream.tags)
        if q and q.strip():
            pattern = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    Dream.content.ilike(pattern),
                    Dream.summary.ilike(pattern),
                    Tag.name.ilike(pattern),
                )
            )
        if tags:
            query = query.filter(Tag.name.in_(tags))
        return (
            query.distinct()
            .order_by(Dream.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )


class TagRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, tag: Tag):
        self.session.add(tag)
        self.session.commit()
        return tag

    def get_by_name(self, name: str):
        return self.session.query(Tag).filter(Tag.name == name).first()

    def get_by_names(self, names: list[str]):
        if not names:
            return []
        return self.session.query(Tag).filter(Tag.name.in_(names)).all()

    def get_all(self) -> list[Tag]:
        return self.session.query(Tag).all()

    def get_for_dream(self, dream_id: int) -> list[Tag]:
        """Return all tags associated with a given dream id."""
        return (
            self.session.query(Tag)
            .join(Tag.dreams)
            .filter(Dream.id == dream_id)
            .order_by(Tag.name.asc())
            .all()
        )

    def get_or_create(self, tag: Tag):
        existing = self.get_by_name(tag.name)
        if existing:
            return existing
        return self.add(tag)


class CommentRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, comment: Comment):
        self.session.add(comment)
        self.session.commit()
        return comment

    def delete(self, comment: Comment):
        self.session.delete(comment)
        self.session.commit()

    def get_all(self):
        return self.session.query(Comment).order_by(Comment.created_at.asc()).all()

    def get(self, comment_id: int):
        return self.session.query(Comment).filter(Comment.id == comment_id).first()

    def get_for_dream(self, dream_id: int):
        return (
            self.session.query(Comment)
            .filter(Comment.dream_id == dream_id)
            .order_by(Comment.created_at.asc())
            .all()
        )

    def update(self, comment_id: int, comment: Comment):
        self.session.query(Comment).filter(Comment.id == comment_id).update(comment)
        self.session.commit()
        return comment

    def update_content(self, comment_id: int, content: str):
        self.session.query(Comment).filter(Comment.id == comment_id).update(
            {"content": content}
        )
        self.session.commit()
        return self.get(comment_id)
