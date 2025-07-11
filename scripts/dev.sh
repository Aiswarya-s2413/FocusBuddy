#!/bin/bash

# Development script for FocusBuddy Docker setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Build and start all services
start_dev() {
    print_status "Starting development environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp env.example .env
        print_warning "Please update .env file with your actual configuration values."
    fi
    
    # Build and start services
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Run migrations
    print_status "Running database migrations..."
    docker-compose exec backend python manage.py migrate
    
    # Create superuser if needed
    print_status "Development environment is ready!"
    print_status "Backend: http://localhost:8000"
    print_status "Frontend: http://localhost:5173"
    print_status "Database: localhost:5432"
    print_status "Redis: localhost:6379"
}

# Stop all services
stop_dev() {
    print_status "Stopping development environment..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
}

# Restart services
restart_dev() {
    print_status "Restarting development environment..."
    stop_dev
    start_dev
}

# Show logs
show_logs() {
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
}

# Run Django management commands
django_command() {
    docker-compose exec backend python manage.py "$@"
}

# Run shell
shell() {
    docker-compose exec backend python manage.py shell
}

# Clean up everything
clean() {
    print_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v --rmi all
        docker system prune -f
        print_status "Cleanup complete!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Main script logic
case "$1" in
    "start")
        check_docker
        start_dev
        ;;
    "stop")
        check_docker
        stop_dev
        ;;
    "restart")
        check_docker
        restart_dev
        ;;
    "logs")
        check_docker
        show_logs
        ;;
    "shell")
        check_docker
        shell
        ;;
    "clean")
        check_docker
        clean
        ;;
    "migrate")
        check_docker
        django_command migrate
        ;;
    "makemigrations")
        check_docker
        django_command makemigrations
        ;;
    "collectstatic")
        check_docker
        django_command collectstatic --noinput
        ;;
    "createsuperuser")
        check_docker
        django_command createsuperuser
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|shell|clean|migrate|makemigrations|collectstatic|createsuperuser}"
        echo ""
        echo "Commands:"
        echo "  start           - Start the development environment"
        echo "  stop            - Stop the development environment"
        echo "  restart         - Restart the development environment"
        echo "  logs            - Show logs from all services"
        echo "  shell           - Open Django shell"
        echo "  clean           - Remove all containers, volumes, and images"
        echo "  migrate         - Run database migrations"
        echo "  makemigrations  - Create new migrations"
        echo "  collectstatic   - Collect static files"
        echo "  createsuperuser - Create a superuser"
        exit 1
        ;;
esac 