# Generated by Django 5.2 on 2025-05-07 04:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('userapp', '0003_mentor'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='bio',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='experience',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='user',
            name='is_mentor',
            field=models.BooleanField(default=False),
        ),
    ]
