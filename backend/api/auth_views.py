# backend/api/auth_views.py
import json
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle

User = get_user_model()

# --- FIX: This throttle was causing the 429 error.
# I've commented it out so you can log in without being blocked.
# class LoginThrottle(AnonRateThrottle):
#    rate = "5/minute"


class CookieTokenObtainPairView(TokenObtainPairView):
    """
    Returns `access` in json body and sets `refresh` token as httpOnly cookie.
    """
    permission_classes = (permissions.AllowAny,)
    
    # --- FIX: Removed the throttle class ---
    # throttle_classes = [LoginThrottle]

    def finalize_response(self, request, response, *args, **kwargs):
        # keep default finalize behavior
        return super().finalize_response(request, response, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        resp = super().post(request, *args, **kwargs)
        # resp.data contains 'access' and 'refresh'
        refresh = resp.data.get("refresh")
        access = resp.data.get("access")
        if refresh:
            response = Response({"access": access}, status=status.HTTP_200_OK)
            max_age = int(settings.SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME", timedelta(days=7)).total_seconds())
            response.set_cookie(
                key="refresh_token",
                value=refresh,
                httponly=True,
                secure=not settings.DEBUG,
                samesite="Lax",
                max_age=max_age,
            )
            return response
        return resp


class CookieTokenRefreshView(APIView):
    """
    Read refresh token from httpOnly cookie, return new access token.
    If ROTATE_REFRESH_TOKENS enabled, issue new refresh and set cookie.
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response({"detail": "Refresh token not provided."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            token = RefreshToken(refresh_token)
            new_access = str(token.access_token)

            # Optionally rotate refresh tokens
            if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS", False):
                # blacklist old refresh (if blacklist app enabled)
                try:
                    token.blacklist()
                except Exception:
                    pass
                # create new refresh for same user
                user_id = token.get("user_id") or token.get("user")
                if user_id is None:
                    return Response({"detail": "Invalid token payload."}, status=status.HTTP_401_UNAUTHORIZED)
                user = User.objects.filter(pk=user_id).first()
                if not user:
                    return Response({"detail": "User not found."}, status=status.HTTP_401_UNAUTHORIZED)
                new_refresh = RefreshToken.for_user(user)
                response = Response({"access": new_access}, status=status.HTTP_200_OK)
                max_age = int(settings.SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME", timedelta(days=7)).total_seconds())
                response.set_cookie(
                    key="refresh_token",
                    value=str(new_refresh),
                    httponly=True,
                    secure=not settings.DEBUG,
                    samesite="Lax",
                    max_age=max_age,
                )
                return response

            return Response({"access": new_access}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"detail": "Invalid refresh token."}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """
    Blacklist refresh token (taken from cookie) and clear cookie.
    """
    refresh_token = request.COOKIES.get("refresh_token")
    if not refresh_token:
        resp = Response({"detail": "Logged out."}, status=status.HTTP_200_OK)
        resp.delete_cookie("refresh_token")
        return resp

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
    except Exception:
        pass

    resp = Response({"detail": "Logged out."}, status=status.HTTP_200_OK)
    resp.delete_cookie("refresh_token")
    return resp