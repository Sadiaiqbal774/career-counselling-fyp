import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import app
from scripts.migrate_accounts_dry_run import build_report
from supabase_auth import SupabaseAuthError, verify_access_token


class StaticKey:
    def __init__(self, key):
        self.key = key


class StaticClient:
    def __init__(self, key):
        self.key = key

    def get_signing_key_from_jwt(self, token):
        return StaticKey(self.key)


class AuthenticationSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        cls.public_key = cls.private_key.public_key()

    def token(self, **overrides):
        claims = {
            "sub": "user-1",
            "aud": "authenticated",
            "iss": "https://example.supabase.co/auth/v1",
            "iat": 1700000000,
            "exp": 4102444800,
            "email": "user@example.com",
            "email_verified": True,
        }
        claims.update(overrides)
        return jwt.encode(claims, self.private_key, algorithm="RS256")

    def test_valid_signed_token_is_accepted(self):
        token = self.token()
        with patch.dict(os.environ, {"SUPABASE_URL": "https://example.supabase.co"}), patch(
            "supabase_auth._jwks_client", return_value=StaticClient(self.public_key)
        ):
            claims = verify_access_token(token)
        self.assertEqual(claims["sub"], "user-1")

    def test_invalid_signature_is_rejected(self):
        token = jwt.encode(
            {"sub": "user-1", "aud": "authenticated", "iss": "https://example.supabase.co/auth/v1",
             "iat": 1700000000, "exp": 4102444800},
            rsa.generate_private_key(public_exponent=65537, key_size=2048),
            algorithm="RS256",
        )
        with patch.dict(os.environ, {"SUPABASE_URL": "https://example.supabase.co"}), patch(
            "supabase_auth._jwks_client", return_value=StaticClient(self.public_key)
        ):
            with self.assertRaises(SupabaseAuthError):
                verify_access_token(token)

    def test_expired_token_is_rejected(self):
        token = self.token(exp=1700000001)
        with patch.dict(os.environ, {"SUPABASE_URL": "https://example.supabase.co"}), patch(
            "supabase_auth._jwks_client", return_value=StaticClient(self.public_key)
        ):
            with self.assertRaises(SupabaseAuthError):
                verify_access_token(token)

    def test_unverified_email_is_rejected_without_provider_confirmation(self):
        from supabase_auth import require_verified_email

        with patch.dict(os.environ, {"SUPABASE_SERVICE_ROLE_KEY": ""}):
            with self.assertRaises(SupabaseAuthError):
                require_verified_email({"email_verified": False}, "token")

    def test_legacy_auth_and_admin_login_are_disabled(self):
        client = app.app.test_client()
        self.assertEqual(client.post("/api/auth/login").status_code, 410)
        self.assertEqual(client.post("/api/auth/google-auth").status_code, 410)
        self.assertEqual(client.post("/api/admin/login").status_code, 410)

    def test_admin_requires_a_verified_supabase_token(self):
        client = app.app.test_client()
        self.assertEqual(client.get("/api/admin/stats").status_code, 401)

    def test_migration_report_is_non_destructive_and_flags_duplicates(self):
        local_users = [{"id": "a", "email": "A@example.com"}, {"id": "b", "email": "a@example.com"}]
        report = build_report(local_users, [])
        self.assertTrue(report["dryRun"])
        self.assertFalse(report["writesPerformed"])
        self.assertEqual(report["duplicateLocalEmails"], ["a@example.com"])
        self.assertEqual(report["mappings"][0]["action"], "manual-review")

    def test_chatbot_does_not_trust_spoofed_identity_fields(self):
        client = app.app.test_client()
        with patch.object(app, "load_json_records", return_value=[]), patch.object(
            app, "save_json_records"
        ) as save_records, patch.object(app, "log_activity"):
            response = client.post(
                "/api/chatbot/interactions",
                json={
                    "userId": "another-user",
                    "userEmail": "victim@example.com",
                    "userName": "Victim",
                    "message": "hello",
                    "response": "hi",
                },
            )

        self.assertEqual(response.status_code, 201)
        saved = save_records.call_args.args[1][0]
        self.assertIsNone(saved["userId"])
        self.assertIsNone(saved["userEmail"])
        self.assertEqual(saved["userName"], "Visitor")

    def test_chatbot_uses_verified_token_identity(self):
        client = app.app.test_client()
        with patch.object(
            app,
            "get_authenticated_user",
            return_value=(
                {
                    "sub": "verified-user",
                    "email": "verified@example.com",
                },
                "token",
            ),
        ), patch.object(app, "load_json_records", return_value=[]), patch.object(
            app, "save_json_records"
        ) as save_records, patch.object(app, "log_activity"):
            response = client.post(
                "/api/chatbot/interactions",
                headers={"Authorization": "Bearer token"},
                json={
                    "userId": "another-user",
                    "userEmail": "victim@example.com",
                    "userName": "Victim",
                    "message": "hello",
                    "response": "hi",
                },
            )

        self.assertEqual(response.status_code, 201)
        saved = save_records.call_args.args[1][0]
        self.assertEqual(saved["userId"], "verified-user")
        self.assertEqual(saved["userEmail"], "verified@example.com")
        self.assertEqual(saved["userName"], "verified")


if __name__ == "__main__":
    unittest.main()
