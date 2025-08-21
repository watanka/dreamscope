from typing import Iterable, List, Dict
from datetime import datetime
from app.db.models import Dream as DBDream, User as DBUser, Comment as DBComment
from app.api.schema import Dream, Comment

def build_user_map(users: Iterable[DBUser]) -> Dict[int, Dict[str, str]]:
    """Build a map of user_id -> {name, avatar_url}."""
    m: Dict[int, Dict[str, str]] = {}
    for u in users:
        name = f"{u.given_name or ''} {u.family_name or ''}".strip() or (
            u.email or "User"
        )
        m[u.id] = {
            "name": name,
            "avatar_url": u.picture or "",
        }
    return m


def serialize_dream(dream: DBDream) -> Dream:
    """Serialize a DBDream to API schema dict with author fields."""
    return Dream(
        id=dream.id,
        user_id=dream.user_id,
        content=dream.content,
        summary=dream.summary,
        analysis=dream.analysis,
        tags=[t.name for t in dream.tags],
        created_at=dream.created_at,
        author_name=dream.user.name(),
        author_avatar_url=dream.user.picture,
    )


def serialize_dreams(dreams: List[DBDream]) -> List[Dream]:
    return [serialize_dream(d) for d in dreams]


def serialize_comment(c: DBComment) -> Comment:
    return Comment(
        id=c.id,
        dream_id=c.dream_id,
        content=c.content,
        created_at=c.created_at,
        parent_id=c.parent_id,
        user_id=c.user_id,
        user_name=c.user.name(),
        user_avatar_url=c.user.picture,
    )


def serialize_comments(comments: List[DBComment]) -> List[Comment]:
    return [serialize_comment(c) for c in comments]
