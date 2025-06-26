from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .authentication import *

class CombinedCookieJWTAuthentication(BaseAuthentication):
    """
    Tries to authenticate using user, mentor, or admin cookie JWTs.
    """
    def authenticate(self, request):
        authenticators = [
            UserCookieJWTAuthentication(),
            MentorCookieJWTAuthentication(),
            AdminCookieJWTAuthentication(),
        ]

        for authenticator in authenticators:
            try:
                result = authenticator.authenticate(request)
                if result is not None:
                    return result
            except AuthenticationFailed:
                continue

        return None
