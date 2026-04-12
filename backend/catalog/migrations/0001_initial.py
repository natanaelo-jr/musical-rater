from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Artist",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("source_provider", models.CharField(default="musicbrainz", max_length=50)),
                ("external_id", models.CharField(max_length=255)),
                ("image_url", models.URLField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={},
        ),
        migrations.CreateModel(
            name="Album",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("source_provider", models.CharField(default="musicbrainz", max_length=50)),
                ("external_id", models.CharField(max_length=255)),
                ("release_date", models.CharField(blank=True, max_length=32)),
                ("cover_url", models.URLField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "primary_artist",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="albums", to="catalog.artist"),
                ),
            ],
            options={},
        ),
        migrations.CreateModel(
            name="Music",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("source_provider", models.CharField(default="musicbrainz", max_length=50)),
                ("external_id", models.CharField(max_length=255)),
                ("duration_seconds", models.PositiveIntegerField(blank=True, null=True)),
                ("release_date", models.CharField(blank=True, max_length=32)),
                ("cover_url", models.URLField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "album",
                    models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name="tracks", to="catalog.album"),
                ),
                (
                    "primary_artist",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="tracks", to="catalog.artist"),
                ),
            ],
            options={},
        ),
        migrations.AddConstraint(
            model_name="artist",
            constraint=models.UniqueConstraint(fields=("source_provider", "external_id"), name="catalog_artist_provider_external_id_unique"),
        ),
        migrations.AddConstraint(
            model_name="album",
            constraint=models.UniqueConstraint(fields=("source_provider", "external_id"), name="catalog_album_provider_external_id_unique"),
        ),
        migrations.AddConstraint(
            model_name="music",
            constraint=models.UniqueConstraint(fields=("source_provider", "external_id"), name="catalog_music_provider_external_id_unique"),
        ),
    ]

