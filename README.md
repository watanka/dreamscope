우선 llm부분은 임시 데이터로 모킹.

🏗 아키텍처 구성

백엔드 (API): FastAPI

엔드포인트

/auth/google : 구글 소셜 로그인

/dreams : 꿈 해몽 생성 (LLM 호출 → DB 저장)

/dreams/{id} : 특정 꿈 해몽 조회

/dreams/feed : 다른 사람들의 해몽 리스트 (게시판)

/comments : 댓글 CRUD

/search?q= : 주제 검색 (DB + pgvector 기반)

DB: PostgreSQL + pgvector

dreams(id, user_id, content, interpretation, embedding, created_at)

comments(id, dream_id, user_id, content, created_at)

users(id, email, name, profile_img)

프론트엔드 (UI): React + TailwindCSS + shadcn/ui

Google OAuth 로그인 → JWT/Session 관리

페이지

DreamPage : 꿈 입력 → 수정구슬 애니메이션 → LLM 해석 결과 표시

FeedPage : 다른 사람들이 올린 꿈 해몽 확인 (댓글 가능)

(옵션) SearchBar : 꿈 키워드 검색, 유사한 꿈 추천

LLM

OpenAI / Anthropic / 로컬 모델 중 선택

입력: 꿈 텍스트

출력: 상징, 감정, 해몽 결과 요약

🎨 UI/UX 구상

테마: 검은색 배경, 반짝이는 별, 달

Navbar: 왼쪽에 로고 🌙 DreamScope, 오른쪽에 로그인, Feed, 내 꿈

DreamPage

중앙에 “수정구슬(애니메이션)”

사용자가 꿈 입력 → "해몽하기" 클릭 → 구슬에 빛 퍼지면서 결과 출력

결과 하단: 공유하기 버튼 (SNS 공유 + 내부 게시판 업로드)

FeedPage

카드 레이아웃 (shadcn 카드 컴포넌트 사용)

각 꿈: 꿈 요약 + 해몽 결과 + 댓글

별 ⭐ hover 시 반짝이는 애니메이션

검색창

FeedPage 상단에 검색창 배치

검색하면 pgvector 기반으로 유사한 꿈 결과 리스트 표시

🚀 개발 우선순위 (MVP)

FastAPI + PostgreSQL(pgvector) 세팅

Google OAuth 로그인

Dream 입력 → LLM 호출 → DB 저장 → 결과 반환

Feed 페이지에서 다른 사람들의 해몽 보기

UI (수정구슬 애니메이션 + 테마)


dreamscope/
├── backend/                  # FastAPI 백엔드
│   ├── app/
│   │   ├── api/              # API 라우터들
│   │   │   ├── __init__.py
│   │   │   ├── auth.py       # 구글 OAuth
│   │   │   ├── dreams.py     # 꿈 해몽 생성/조회
│   │   │   ├── comments.py   # 댓글 CRUD
│   │   │   └── search.py     # 검색 (초기엔 LIKE, 나중엔 pgvector)
│   │   ├── core/             # 설정/유틸
│   │   │   ├── config.py     # 환경변수 로드
│   │   │   ├── security.py   # JWT/세션 관련
│   │   │   └── llm.py        # LLM 호출 함수
│   │   ├── db/
│   │   │   ├── base.py       # DB 연결
│   │   │   ├── models.py     # SQLAlchemy 모델 정의
│   │   │   ├── schemas.py    # Pydantic 스키마
│   │   │   └── crud.py       # DB CRUD 함수
│   │   ├── main.py           # FastAPI 엔트리포인트
│   │   └── dependencies.py   # 공용 Depends
│   ├── alembic/              # DB 마이그레이션 (선택)
│   ├── tests/                # 백엔드 테스트
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                 # React + Tailwind + shadcn UI
│   ├── public/
│   │   ├── index.html
│   │   └── icons/            # 파비콘, 로고
│   ├── src/
│   │   ├── components/       # UI 컴포넌트
│   │   │   ├── Navbar.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── DreamCard.tsx
│   │   │   └── CrystalBall.tsx  # 수정구슬 애니메이션
│   │   ├── pages/            # 라우트별 페이지
│   │   │   ├── DreamPage.tsx # 꿈 작성 + 결과 확인
│   │   │   ├── FeedPage.tsx  # 다른 사람들 꿈 해몽
│   │   │   └── LoginPage.tsx
│   │   ├── lib/              # 헬퍼 함수 (api fetch 등)
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── tailwind.config.js
│   ├── shadcn.config.json
│   ├── package.json
│   └── vite.config.ts        # Vite (React 빌드 도구)
│
├── docker-compose.yml        # 전체 서비스 실행 (DB + backend + frontend)
├── .env                      # 환경변수 (DB URL, OAuth 키 등)
├── .gitignore
└── README.md



- 시간 표시

- 광고 추가

로그인
- login 후에는 로그인 정보를 사용하도록 처리 done
- 꿈 해몽 요청/댓글 작성 시, 로그인 연동, 로그아웃 기능 추가 done
- comments에 사용자 id랑 profile_picture 표시 done
    
- /me에서 사용자가 작성한 꿈들 확인
- 댓글에 대댓글을 달 수 있도록 표시. done
    - 대댓글-텍스트 입력 중 포커스 튀는 문제 해결 done
- 사용자 공유한 글 새로운 상세 페이지에서 볼 수 있도록 표시 done
- 사이트 로고 추가 done
- SEO 최적화
    - 검색어에 잘 걸릴만한 꿈들 정리해서 DB에 추가
- llm 결과를 구조화해서 보기 쉽게 UI 정리 done
    - search창에서 태그들로 찾아볼 수 있도록 추가 done
- 댓글 쿼리 시, user name이 필요함. 이 name은 user_id로 다시 조회해야해서 N+1 문제 발생. 이것에 대한 selected, joined 쿼리 사용해서 쿼리 비용 최적화. 


- google cloud run으로 배포
    - dockerfile 작성 완료
    - google cloud run 셋팅
- firebase로 frontend 배포
- supabase로 db 구축
- llm 결과가 아예 나올 수 없는 항목들에 대한 예외 처리. 아예 꿈과 관련된 없는 값을 넣었을 때, llm에서 결과가 pydantic model로 나오지 않고, 답변이 불가능하다는 str이 나온다.

- 어제 밤 꿈에서 가족들과 함께 차를 타고 여행가는 꿈을 꿨어. 무슨 얘기를 했는지는 기억 나지 않지만, 마음이 편하고 행복했어.


frontend -> google oauth -> backend -> 요청 처리 -> frontend