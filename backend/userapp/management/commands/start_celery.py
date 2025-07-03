from django.core.management.base import BaseCommand
import subprocess
import sys

class Command(BaseCommand):
    help = 'Start Celery worker and beat'

    def handle(self, *args, **options):
        # Start celery worker in background
        worker_process = subprocess.Popen([
            sys.executable, '-m', 'celery', '-A', 'backend', 'worker', '--loglevel=info'
        ])
        
        # Start celery beat
        beat_process = subprocess.Popen([
            sys.executable, '-m', 'celery', '-A', 'backend', 'beat', '--loglevel=info'
        ])
        
        try:
            worker_process.wait()
            beat_process.wait()
        except KeyboardInterrupt:
            worker_process.terminate()
            beat_process.terminate()