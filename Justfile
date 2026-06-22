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

coverage:
    backend/scripts/coverage.sh

dev:
    just db
    just migrate
    just backend & just frontend

test-backend:
    cd backend && uv run python manage.py test

test-frontend headed="false":
    cd frontend && npx cypress run $([ "{{headed}}" = "true" ] && echo "--headed" || echo "")

test target="all" headed="false":
    @if [ "{{target}}" = "backend" ]; then \
        just test-backend; \
    elif [ "{{target}}" = "frontend" ]; then \
        just test-frontend "{{headed}}"; \
    elif [ "{{target}}" = "coverage" ]; then \
        just coverage; \
    elif [ "{{target}}" = "all" ]; then \
        just test-backend && just test-frontend "{{headed}}"; \
    else \
        echo "Usage: just test [all|backend|frontend|coverage] [true|false]"; \
        exit 1; \
    fi
