#!/usr/bin/env bash
set -e
cd /Users/harsharkhel/Documents/GitHub/cvalign/FRONTEND && npm run lint > /tmp/cvalign-lint.txt 2>&1
echo "LINT_EXIT:$?"
cat /tmp/cvalign-lint.txt
cd /Users/harsharkhel/Documents/GitHub/cvalign/cvalign-ai-backend
. .venv/bin/activate
python3 -m pytest --tb=short -q > /tmp/cvalign-pytest.txt 2>&1
echo "PYTEST_EXIT:$?"
cat /tmp/cvalign-pytest.txt
