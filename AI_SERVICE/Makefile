.PHONY: setup audit build-data train evaluate test lint run docker clean help

PYTHON ?= python

help:
	@echo "Available targets:"
	@echo "  setup       - Install development dependencies"
	@echo "  audit       - Audit raw dataset and generate DATA_AUDIT.md"
	@echo "  build-data  - Process raw dataset and compile knowledge base"
	@echo "  train       - Train disease recommendation model"
	@echo "  evaluate    - Run comprehensive evaluation and generate report"
	@echo "  test        - Run pytest suite"
	@echo "  lint        - Run ruff linter and mypy type checker"
	@echo "  run         - Run FastAPI service locally"
	@echo "  docker      - Build Docker container image"

setup:
	$(PYTHON) -m pip install -r requirements-dev.txt

audit:
	$(PYTHON) scripts/audit_dataset.py

build-data:
	$(PYTHON) scripts/build_dataset.py

train:
	$(PYTHON) scripts/train.py

evaluate:
	$(PYTHON) scripts/evaluate.py

test:
	$(PYTHON) -m pytest tests/

lint:
	$(PYTHON) -m ruff check .
	$(PYTHON) -m mypy drug_recommendation chatbot scripts main.py

run:
	$(PYTHON) -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

docker:
	docker build -t ai-service:latest .
