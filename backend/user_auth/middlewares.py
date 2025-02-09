from .models import CustomUser


class ManageAccessMiddleware:
    """To store logs and important information in the database"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # FIXME : Remove this not needed
        # if request.path.startswith("/geo-data/") and request.user.is_authenticated:
        return self.get_response(request)
