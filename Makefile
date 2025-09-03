.PHONY: backend frontend dev

backend:
	cd backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

dev: 
	$(MAKE) backend &
	$(MAKE) frontend


frontend-deploy:
	cd frontend && npm run build && firebase deploy