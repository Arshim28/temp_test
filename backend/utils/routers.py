class MultiDBRouter:
    """
    A router to direct database operations for models in 'utils' between
    the default and external databases.
    """

    external_models = {"maharashtrametadata"}  # Use lowercase model names

    def db_for_read(self, model, **hints):
        """Route read queries based on the model name."""
        if model._meta.model_name in self.external_models:
            return "external_db"  # Read from external DB
        return "default"  # Otherwise, read from default DB

    def db_for_write(self, model, **hints):
        """Prevent writes to external DB, allow writes to default DB."""
        if model._meta.model_name in self.external_models:
            return None  # Do not allow writes
        return "default"  # Allow writes to default DB

    def allow_relation(self, obj1, obj2, **hints):
        """Allow relations only within the same database."""
        db_set = {self.db_for_read(obj1), self.db_for_read(obj2)}
        if len(db_set) == 1:  # Both objects are in the same DB
            return True
        return False  # Prevent cross-database relations

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Allow migrations only for default DB models."""
        if model_name in self.external_models:
            return False  # No migrations for external DB models
        return db == "default"  # Only migrate models on default DB
