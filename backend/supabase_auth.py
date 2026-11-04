import json
import os
import time
from functools import lru_cache
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import jwt


class SupabaseAuthError(Exception):
    """Raised when a Supabase access token cannot be trusted."""


def _supabase_settings():
    url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    audience = os.environ.get("SUPABASE_JWT_AUDIENCE", "authenticated").strip()
    if not url:
        raise SupabaseAuthError("Supabase authentication is not configured.")
    return url, audience


@lru_cache(maxsize=4)
def _jwks_client(jwks_url):
    return jwt.PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=300)


def verify_access_token(token):
    if not token:
        raise SupabaseAuthError("Authentication required.")

    supabase_url, audience = _supabase_settings()
    issuer = f"{supabase_url}/auth/v1"
    jwks_url = f"{issuer}/.well-known/jwks.json"

    try:
        signing_key = _jwks_client(jwks_url).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience=audience,
            issuer=issuer,
            options={"require": ["exp", "iat", "sub", "aud", "iss"]},
        )
    except (jwt.PyJWTError, ValueError, HTTPError, URLError, OSError) as error:
        raise SupabaseAuthError("Invalid or expired Supabase access token.") from error

    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject.strip():
        raise SupabaseAuthError("Supabase access token has no valid subject.")

    return claims


def _service_role_user(token):
    supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not supabase_url or not service_key:
        return None

    request = Request(
        f"{supabase_url}/auth/v1/user",
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": service_key,
        },
    )
    try:
        with urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, ValueError, OSError):
        return None


def require_verified_email(claims, token):
    email_verified = claims.get("email_verified")
    confirmed_at = claims.get("email_confirmed_at")
    if email_verified is True or confirmed_at:
        return

    user = _service_role_user(token)
    if not user or not user.get("email_confirmed_at"):
        raise SupabaseAuthError("Email verification is required.")


def admin_email_allowlist():
    raw = os.environ.get("ADMIN_EMAILS", "")
    return {
        email.strip().lower()
        for email in raw.split(",")
        if email.strip()
    }


def is_admin(claims, verified_email):
    email = str(verified_email or "").strip().lower()
    return bool(email and email in admin_email_allowlist())
