from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0002_rating"),
    ]

    operations = [
        migrations.AddField(
            model_name="rating",
            name="review",
            field=models.TextField(blank=True),
        ),
    ]
