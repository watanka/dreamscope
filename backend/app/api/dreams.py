from fastapi import APIRouter, Body, Depends, HTTPException, Response
from app.dependencies import get_db, get_current_user
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.repository import (
    DreamRepository,
    TagRepository,
    CommentRepository,
)
from app.db.models import Dream as DBDream, Comment as DBComment, User as DBUser
from app.api.serializers import (
    serialize_dream,
    serialize_dreams,
    serialize_comment,
    serialize_comments,
)
from app.api.schema import (
    Dream as DreamSchema,
    DreamInterpretation,
    DreamListResponse,
    Tag as TagSchema,
)
from app.core.llm import dream_chain

router = APIRouter()


@router.post("/")
def create_dream(
    content: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user),
):
    """Create a dream with a mocked interpretation and return minimal payload used by frontend."""
    dream_repo = DreamRepository(db)
    tag_repo = TagRepository(db)
    try:
        interpretation: DreamInterpretation = dream_chain.invoke(
            {
                "dream_text": content,
                "existing_tags": "\n".join([t.name for t in tag_repo.get_all()]),
            }
        )
        dream = DBDream(
            user_id=current_user.id,
            content=content,
            summary=interpretation.summary,
            analysis=interpretation.analysis,
            created_at=datetime.utcnow(),
        )
        dream.tags = [
            tag_repo.get_or_create(tag.to_dbschema()) for tag in interpretation.tags
        ]
        dream = dream_repo.create(dream)
        # TODO: pydantic model로 수정, serializer로 변환
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    return serialize_dream(dream)


@router.get("/", response_model=DreamListResponse)
def get_dreams(
    tags: str | None = None,
    page: int = 1,
    limit: int = 10,
    response: Response = None,
    db: Session = Depends(get_db),
):
    """List dreams ordered by newest first.

    Supports optional comma-separated tag names via `tags`.
    """
    dream_repo = DreamRepository(db)
    tag_repo = TagRepository(db)

    tag_list: list[str] | None = None
    if tags:
        # parse comma-separated names, normalize and dedupe
        parts = [p.strip().lower() for p in tags.split(",")]
        tag_list = sorted({p for p in parts if p})

    total = dream_repo.count_advanced(tag_list)
    dreams = dream_repo.search_advanced_page(tag_list, page, limit) if total else []

    selected_tags: list[TagSchema] | None = None
    if tag_list:
        # Resolve selected tag names to objects (including description)
        tags_objs = tag_repo.get_by_names(tag_list)
        selected_tags = [
            TagSchema(name=t.name, description=t.description) for t in tags_objs
        ]
    if response is not None:
        try:
            response.headers["X-Total-Count"] = str(total)
        except Exception:
            pass
    return DreamListResponse(
        dreams=serialize_dreams(dreams), selected_tags=selected_tags
    )


@router.get("/{dream_id}", response_model=DreamSchema)
def get_dream(dream_id: int, db: Session = Depends(get_db)):
    dream_repo = DreamRepository(db)
    d = dream_repo.get(dream_id)
    if not d:
        raise HTTPException(status_code=404, detail="Dream not found")
    return serialize_dream(d)


# 댓글
@router.get("/{dream_id}/comments")
def get_comments(dream_id: int, db: Session = Depends(get_db)):
    comment_repo = CommentRepository(db)
    comments = comment_repo.get_for_dream(dream_id)
    return serialize_comments(comments)


@router.post("/{dream_id}/comments")
def create_comment(
    dream_id: int,
    content: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user),
):
    comment_repo = CommentRepository(db)
    c = DBComment(
        dream_id=dream_id,
        content=content,
        parent_id=None,
        user_id=current_user.id,
        created_at=datetime.utcnow(),
    )
    c = comment_repo.create(c)
    return serialize_comment(c)


@router.post("/{dream_id}/comments/{comment_id}")
def update_comment(
    dream_id: int,
    comment_id: int,
    content: str = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    comment_repo = CommentRepository(db)
    existing = comment_repo.get(comment_id)
    if not existing or existing.dream_id != dream_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    updated = comment_repo.update_content(comment_id, content)
    return serialize_comment(updated)


@router.delete("/{dream_id}/comments/{comment_id}")
def delete_comment(dream_id: int, comment_id: int, db: Session = Depends(get_db)):
    comment_repo = CommentRepository(db)
    c = comment_repo.get(comment_id)
    if not c or c.dream_id != dream_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment_repo.delete(c)
    return {"ok": True}


# 대댓글
@router.post("/{dream_id}/comments/{comment_id}/replies")
def create_reply(
    dream_id: int,
    comment_id: int,
    content: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user),
):
    comment_repo = CommentRepository(db)
    parent = comment_repo.get(comment_id)
    if not parent or parent.dream_id != dream_id:
        raise HTTPException(status_code=404, detail="Parent comment not found")
    c = DBComment(
        dream_id=dream_id,
        content=content,
        parent_id=comment_id,
        user_id=current_user.id,
        created_at=datetime.utcnow(),
    )
    c = comment_repo.create(c)
    return serialize_comment(c)
