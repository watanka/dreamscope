from langchain.prompts import PromptTemplate
from langchain.output_parsers import PydanticOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END
from typing import Optional, TypedDict, cast
from sqlalchemy.orm import Session
from datetime import datetime
from app.api.schema import DreamInterpretation  # type: ignore[import]
from app.db.repository import DreamRepository, TagRepository
from app.db.models import Dream as DBDream

# 1) Pydantic parser 정의
parser = PydanticOutputParser(pydantic_object=DreamInterpretation)

# 2) 프롬프트 템플릿 정의 (메모리 컨텍스트 포함)
dream_prompt = PromptTemplate(
    template="""
SYSTEM
You are "DreamScope," a careful, non-clinical dream analyst. 
You DO NOT predict the future or give medical/psychological diagnosis. 
You explore symbolic meanings, emotions, and personal themes to help reflection. 
Be culturally neutral, nonjudgmental, and curious. You need to draw people's attentions, and suggest little advice or tips to their dreams.
Write in the same language as the user's input (Korean stays Korean; otherwise use English), But tags such as events and subjects should be always categorized in English.

INSTRUCTIONS
1) Read the dream and extract components below:
   - Summary (1-2 sentence gist of the dream)
   - Interpret dream into tags(events, objects, background, characters) should be able to broadly categorized, so that users can find their dreams categories. For example, "dream of falling" should be categorized as "falling", "driving with family" shoudl be categorized as "driving", "family". Tags can be list. 
   - Tags contains name and description, explanation of the meaning of dreams.
   - Using the already existing tags below as a reference. Do not duplicate tags.
   - Based on tags and their descriptions, generate analysis Analysis(interpretation of the dream; interpretation should be based on the astrology, oneiromancy, or eastern dream interpretation history. You need to mention the source of the interpretation.) Take account for the tags and their mixtures, and try to explain them in positive vibes, and try to explain them in a way that make sense.
   - Give little advice or tips for the user to deal with their dreams, if possible.

2) Return only structured JSON strictly matching this format:
{format_instructions}

DREAM INPUT:
{dream_text}

MEMORY CONTEXT (previous user dreams summaries; optional):
{memory_context}

EXISTING TAGS:
{existing_tags}
""",
    input_variables=["dream_text", "existing_tags", "memory_context"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)

# 3) 모델 초기화
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    temperature=0.7,
)


"""
LangGraph 기반 파이프라인
- 1) load_memories: 사용자 과거 꿈을 불러와 memory_context 생성
- 2) llm_infer: memory_context + 기존 태그를 포함한 프롬프트로 LLM 호출 후 파싱
- 3) add_memory: 생성된 해몽과 함께 금일의 꿈을 DB에 저장(태그 연결 포함)
"""


class DreamState(TypedDict, total=False):
    dream_text: str
    existing_tags: str
    user_id: int
    db: Session

    memory_context: Optional[str]
    interpretation: Optional[DreamInterpretation]
    saved_dream_id: Optional[int]


def node_load_memories(state: DreamState) -> dict:
    db: Session = state["db"]
    user_id: int = state["user_id"]
    # 최근 5개 요약을 메모리 컨텍스트로 제공 (Repository 사용)
    repo = DreamRepository(db)
    recent = repo.get_recent_for_user(user_id=user_id, limit=5)
    lines: list[str] = []
    for d in recent:
        date_str = d.created_at.strftime("%Y-%m-%d") if d.created_at else ""
        summary = d.summary or (d.content[:120] + ("…" if len(d.content) > 120 else ""))
        lines.append(f"- [{date_str}] {summary}")
    memory_context = "\n".join(lines) if lines else ""
    return {"memory_context": memory_context}


def node_llm_infer(state: DreamState) -> dict:
    # memory_context는 없을 수 있음
    prompt_input = {
        "dream_text": state["dream_text"],
        "existing_tags": state["existing_tags"],
        "memory_context": state.get("memory_context") or "",
    }
    result = (dream_prompt | llm | parser).invoke(prompt_input)
    # result 는 DreamInterpretation (Pydantic 모델)
    return {"interpretation": result}


def node_add_memory(state: DreamState) -> dict:
    db: Session = state["db"]
    user_id: int = state["user_id"]
    interpretation = cast(DreamInterpretation, state["interpretation"])

    dream_repo = DreamRepository(db)
    tag_repo = TagRepository(db)

    dream = DBDream(
        user_id=user_id,
        content=state["dream_text"],
        summary=interpretation.summary,
        analysis=interpretation.analysis,
        created_at=datetime.utcnow(),
    )
    # 태그 연결
    dream.tags = [
        tag_repo.get_or_create(tag.to_dbschema()) for tag in interpretation.tags
    ]
    dream = dream_repo.create(dream)
    return {"saved_dream_id": dream.id, "interpretation": interpretation}


# 그래프 컴파일
graph = StateGraph(DreamState)
graph.add_node("load_memories", node_load_memories)
graph.add_node("llm_infer", node_llm_infer)
graph.add_node("add_memory", node_add_memory)

graph.add_edge(START, "load_memories")
graph.add_edge("load_memories", "llm_infer")
graph.add_edge("llm_infer", "add_memory")
graph.add_edge("add_memory", END)

dream_graph = graph.compile()

# prompt = PromptTemplate.from_template(
#     input_variables=["user_dream_text"], template="""
# SYSTEM
# You are “DreamScope,” a careful, non-clinical dream analyst.
# You DO NOT predict the future or give medical/psychological diagnosis.
# You explore symbolic meanings, emotions, and personal themes to help reflection.
# Be culturally neutral, nonjudgmental, and curious.
# Write in the same language as the user’s input (Korean stays Korean; otherwise use English).

# INSTRUCTIONS
# 1) Read the dream and extract components in four buckets:
#    - Events (무슨 일이 일어났는가; 순서 포함)
#    - Objects (무엇이 나왔는가; 색/형태/상징성)
#    - Background (언제/어디서/어떤 상황/분위기)
#    - Characters (등장인물; 관계/역할/태도)
# 2) For each bucket, generate multiple tags (short, kebab-case or snake_case; max 8 per bucket).
# 3) Identify emotions (valence/arousal), and the main themes (e.g., change, loss, pursuit, achievement, intimacy, anxiety, identity).
# 4) Offer 2–3 plausible interpretations (“lenses”):
#    - symbolic lens (상징 해석)
#    - emotional/psychological lens (감정/욕구)
#    - life-context lens (최근 생활 맥락에 따른 시사점)
#    Each lens: what it could mean, why (evidence from text), what to reflect on.
# 5) Provide 3–5 reflective prompts that help the user link this dream to their life
#    (e.g., recent events, relationships, goals, unresolved emotions, choices).
# 6) Suggest 2–4 gentle, non-prescriptive actions (journaling, conversation, rest, experimental action).
# 7) Produce search terms (EN + KO) and share-safe title/excerpt for the public page.
# 8) If content is sensitive (self-harm, abuse, explicit, identifiable info), set flags and add a gentle safety note.
# 9) Be concise but vivid. Avoid deterministic claims.

# OUTPUT (valid JSON):
# {{
#   "summary": "1-2 sentence gist of the dream.",
#   "timeline_events": {{
#     {{"order": 1, "event": "...", "evidence": "..."}},
#     {{"order": 2, "event": "...", "evidence": "..."}}
#   }},
#   "components": {{
#     "events": {{
#       "items": ["...", "..."],
#       "tags": ["being_chased", "exam_failure", "falling"]
#     }},
#     "objects": {{
#       "items": ["...", "..."],
#       "tags": ["loose_teeth", "dark_water", "phone_broken"]
#     }},
#     "background": {{
#       "time": "night/morning/unsure/…",
#       "place": "…",
#       "situation": "…",
#       "atmosphere": "…",
#       "tags": ["school_setting", "crowded_space", "stormy_weather"]
#     }},
#     "characters": {{
#       "list": [
#         {{"who": "mother/boss/stranger/self-duplicate/…", "role": "helper/opponent/observer", "traits": ["…"] }}
#       ],
#       "tags": ["authority_figure", "inner_child", "unknown_crowd"]
#     }}
#   }},
#   "emotions": {{
#     "primary": ["fear", "relief", "awe"],
#     "valence": -0.6,              // -1 (very negative) to +1 (very positive)
#     "arousal": 0.7                 // 0 (calm) to 1 (intense)
#   }},
#   "themes": ["transition", "control", "appearance", "loss"],
#   "interpretations": [
#     {{
#       "lens": "symbolic",
#       "meaning": "...",
#       "why": ["quote/evidence 1", "quote/evidence 2"],
#       "reflection": "사용자가 생각해볼 질문 1"
#     }},
#     {{
#       "lens": "emotional",
#       "meaning": "...",
#       "why": ["..."],
#       "reflection": "..."
#     }},
#     {{
#       "lens": "life-context",
#       "meaning": "...",
#       "why": ["..."],
#       "reflection": "..."
#     }}
#   ],
#   "reflective_prompts": [
#     "최근에 외모/평판과 관련된 걱정이 있었나요?",
#     "스스로 통제할 수 없다고 느낀 상황은?",
#     "누구에게 무언가를 숨기고 있나요?"
#   ],
#   "gentle_actions": [
#     "오늘 느낀 감정의 원인을 5분간 저널링해 보기",
#     "신뢰하는 사람과 꿈의 핵심 장면 한 가지를 공유해 보기"
#   ],
#   "tags_by_bucket": {{
#     "events": ["..."], "objects": ["..."], "background": ["..."], "characters": ["..."]
#   }},
#   "global_tags": ["teeth_falling_out", "public_speaking", "exam_anxiety"],
#   "search_terms": {{
#     "en": ["teeth falling out dream meaning", "dream of losing teeth anxiety"],
#     "ko": ["이빨 빠지는 꿈 해몽", "이에 금 가는 꿈 의미"]
#   }},
#   "share": {{
#     "title": "이빨이 우르르 빠진 꿈",
#     "excerpt": "사람들 앞에서 이가 빠지고 숨기려던 장면… 불안과 이미지에 대한 걱정의 상징일 수 있어요."
#   }},
#   "sensitive_flags": {{
#     "violence": false, "self_harm": false, "explicit": false, "identifiable_third_party": false
#   }},
#   "confidence": 0.72,  // overall confidence
#   "notes": "This is not medical or legal advice; use as a reflection aid."
# }}

# USER_DREAM
# {{ user_dream_text }}
# """,
# )
# def analyze_dream(user_dream_text: str):
#     filled_prompt = prompt.format(user_dream_text=user_dream_text)
#     resp = model.invoke(filled_prompt)
#     try:
#         return resp.content
#     except AttributeError:
#         return str(resp)
