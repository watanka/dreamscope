from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.dependencies import get_db
from app.db.repository import DreamRepository, UserRepository
from app.api.serializers import serialize_dreams
from app.api.schema import Dream as DreamSchema

router = APIRouter()


@router.get("/", response_model=List[DreamSchema])
def search(q: str = "", db: Session = Depends(get_db)):
    q = (q or "").strip()
    if not q:
        return []
    dream_repo = DreamRepository(db)
    user_repo = UserRepository(db)
    dreams = dream_repo.search_like(q)
    user_ids = list({d.user_id for d in dreams})
    users = user_repo.get_by_ids(user_ids)
    return serialize_dreams(dreams, users)