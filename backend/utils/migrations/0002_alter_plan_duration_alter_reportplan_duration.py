# Generated by Django 5.1.4 on 2025-02-08 09:34

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("utils", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="plan",
            name="duration",
            field=models.IntegerField(default=12),
        ),
        migrations.AlterField(
            model_name="reportplan",
            name="duration",
            field=models.IntegerField(default=12),
        ),
    ]
