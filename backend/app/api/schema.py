from pydantic import BaseModel
from typing import List
from datetime import datetime


class User(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: str


class Dream(BaseModel):
    id: int
    user_id: int
    content: str
    summary: str | None = None
    analysis: str
    tags: List[str] = []
    created_at: datetime
    author_name: str
    author_avatar_url: str


class DreamCreate(BaseModel):
    user_id: int
    content: str


class DreamListResponse(BaseModel):
    dreams: List[Dream]


class DreamInterpretation(BaseModel):
    summary: str
    tags: List[str]
    analysis: str

class Comment(BaseModel):
    id: int
    dream_id: int
    content: str
    created_at: datetime
    parent_id: int | None = None
    user_id: int
    user_name: str
    user_avatar_url: str