# Generated by Django 5.2.4 on 2025-07-11 09:10

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('userapp', '0012_focusbuddyparticipant_status'),
    ]

    operations = [
        migrations.CreateModel(
            name='MentorReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reason', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('mentor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reports', to='userapp.mentor')),
                ('reporter', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mentor_reports', to=settings.AUTH_USER_MODEL)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mentor_reports', to='userapp.mentorsession')),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('reporter', 'mentor', 'session')},
            },
        ),
    ]
