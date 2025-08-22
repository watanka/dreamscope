from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime


dream_tags = Table(
    "dream_tags",
    Base.metadata,
    Column("dream_id", Integer, ForeignKey("dreams.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True)
    name = Column(String(64), unique=True, index=True)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    dreams = relationship(
        "Dream",
        secondary="dream_tags",
        back_populates="tags",
    )


class Dream(Base):
    __tablename__ = "dreams"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    content = Column(String)
    summary = Column(String, nullable=True)
    analysis = Column(String)
    # embedding = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    comments = relationship(
        "Comment", back_populates="dream", cascade="all, delete-orphan"
    )
    tags = relationship("Tag", secondary="dream_tags", back_populates="dreams")
    user = relationship("User", back_populates="dreams")


class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True)
    dream_id = Column(Integer, ForeignKey("dreams.id"), nullable=False)
    parent_id = Column(ForeignKey("comments.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    dream = relationship("Dream", back_populates="comments")
    parent = relationship(
        "Comment",
        back_populates="children",
        remote_side=[id],
        foreign_keys=[parent_id],
    )
    user = relationship("User", back_populates="comments")
    children = relationship(
        "Comment", back_populates="parent", cascade="all, delete-orphan"
    )


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String)
    given_name = Column(String)
    family_name = Column(String)
    picture = Column(String(255), nullable=True)
    # Optional reverse relations
    # comments = relationship("Comment", backref="user")
    dreams = relationship("Dream", back_populates="user")
    comments = relationship("Comment", back_populates="user")

    def name(self):
        return self.given_name + " " + self.family_name
