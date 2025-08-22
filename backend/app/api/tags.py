from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from app.dependencies import get_db
from app.db.repository import TagRepository
from app.api.schema import Tag as TagSchema

router = APIRouter()

@router.get("/", response_model=List[str])
def list_tags(db: Session = Depends(get_db)):
    repo = TagRepository(db)
    tags = repo.get_all()
    return [t.name for t in tags]


@router.get("/meta", response_model=List[TagSchema])
def list_tag_meta(names: str | None = Query(default=None), db: Session = Depends(get_db)):
    """
    Return tag metadata (name, description) for given comma-separated names.
    If names is empty, returns empty list to avoid dumping all metadata.
    """
    repo = TagRepository(db)
    if not names:
        return []
    parts = [p.strip().lower() for p in names.split(",")]
    cleaned = sorted({p for p in parts if p})
    if not cleaned:
        return []
    tags = repo.get_by_names(cleaned)
    return [TagSchema(name=t.name, description=getattr(t, "description", None)) for t in tags]
