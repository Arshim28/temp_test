#!/bin/bash

export DJANGO_SETTINGS_MODULE="base.settings"

# Function to display usage
usage() {
    echo "Usage: $0 {runserver|test} [port]"
    exit 1
}

# Check if at least one argument is passed
if [ $# -lt 1 ]; then
    usage
fi

# Get the command
COMMAND=$1
PORT=${2:-8000}  # Default port is 8000 if not provided

# Execute the appropriate command
case "$COMMAND" in
    runserver)
        echo "Starting Django development server on port $PORT..."
        python manage.py runserver 0.0.0.0:$PORT --settings=$DJANGO_SETTINGS_MODULE
        ;;
    test)
        echo "Running tests with SQLite..."
        export DJANGO_SETTINGS_MODULE="base.test_settings"
        python manage.py test --settings=$DJANGO_SETTINGS_MODULE
        ;;
    *)
        usage
        ;;
esac
