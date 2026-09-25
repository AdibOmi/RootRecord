#!/bin/sh
set -e
alembic upgrade head
python -m app.cli bootstrap-admin
exec "$@"
