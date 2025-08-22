from pydantic import BaseModel
from typing import List
from datetime import datetime
from app.db.models import Tag as DBTag


class User(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: str


class Tag(BaseModel):
    name: str
    description: str | None = None

    def to_dbschema(self):
        return DBTag(name=self.name, description=self.description)


class Dream(BaseModel):
    id: int
    user_id: int
    content: str
    summary: str | None = None
    analysis: str
    tags: List[Tag] = []
    created_at: datetime
    author_name: str
    author_avatar_url: str


class DreamCreate(BaseModel):
    user_id: int
    content: str


class DreamListResponse(BaseModel):
    dreams: List[Dream]
    selected_tags: List[Tag] | None = None


class DreamInterpretation(BaseModel):
    summary: str
    tags: List[Tag]
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
