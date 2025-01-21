# Generated by Django 5.1.4 on 2025-01-20 14:37

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('utils', '0006_remove_transaction_duration_plan_duration'),
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
    ]
