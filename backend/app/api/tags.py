from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.dependencies import get_db
from app.db.repository import TagRepository

router = APIRouter()

@router.get("/", response_model=List[str])
def list_tags(db: Session = Depends(get_db)):
    repo = TagRepository(db)
    tags = repo.get_all()
    return [t.name for t in tags]
