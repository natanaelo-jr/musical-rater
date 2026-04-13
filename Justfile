set shell := ["bash", "-c"]

db:
    docker-compose up -d

backend:
    cd backend && uv run python manage.py runserver

frontend:
    cd frontend && npm run dev

migrate:
    cd backend && uv run python manage.py migrate

lint:
    pre-commit run --all-files

dev:
    just db
    just migrate
    just backend & just frontend