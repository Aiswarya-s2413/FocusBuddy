# Generated by Django 5.2 on 2025-05-16 10:57

import cloudinary.models
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('userapp', '0007_journal'),
    ]

    operations = [
        migrations.AddField(
            model_name='mentor',
            name='profile_image',
            field=cloudinary.models.CloudinaryField(blank=True, max_length=255, null=True, verbose_name='image'),
        ),
    ]
