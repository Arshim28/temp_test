# Generated by Django 5.1.4 on 2025-01-15 10:19

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MaharashtraMetadata',
            fields=[
                ('ogc_fid', models.AutoField(primary_key=True, serialize=False)),
                ('sid', models.IntegerField()),
                ('state_code', models.CharField(max_length=10)),
                ('state_name', models.CharField(max_length=100)),
                ('district_code', models.CharField(max_length=10)),
                ('district_name', models.CharField(max_length=100)),
                ('taluka_code', models.CharField(max_length=10)),
                ('taluka_name', models.CharField(max_length=100)),
                ('village_code', models.CharField(max_length=10)),
                ('village_version', models.CharField(max_length=10)),
                ('village_name', models.CharField(max_length=100)),
                ('village_name_marathi', models.CharField(max_length=100)),
                ('village_status', models.CharField(max_length=20)),
                ('census_2001_code', models.CharField(max_length=10)),
                ('census_2011_code', models.CharField(max_length=10)),
            ],
            options={
                'db_table': 'maharashtra_metadata',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='Plan',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('plan_type', models.CharField(choices=[('Village', 'Village'), ('District', 'District'), ('Taluka', 'Taluka'), ('Free', 'Free')], max_length=255)),
                ('entity_name', models.CharField(max_length=255)),
                ('duration', models.IntegerField(default=0)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='plans', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ReportPlan',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('quantity', models.IntegerField(default=0)),
                ('duration', models.IntegerField(default=0)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='report_plans', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ReportTransaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('details', models.JSONField(blank=True, null=True)),
                ('report_plan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='utils.reportplan')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('details', models.JSONField(blank=True, null=True)),
                ('plan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='utils.plan')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
    ]
