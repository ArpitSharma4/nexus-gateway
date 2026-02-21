import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Fallback key for development — IN PRODUCTION, SET MASTER_ENCRYPTION_KEY
DEFAULT_KEY = base64.urlsafe_b64encode(b"nexus-gateway-default-insecure-key-32")

class SecurityManager:
    def __init__(self):
        key_str = os.getenv("MASTER_ENCRYPTION_KEY")
        if not key_str:
            print("[WARNING] MASTER_ENCRYPTION_KEY not set. Using default insecure key.")
            self.fernet = Fernet(DEFAULT_KEY)
        else:
            # Ensure the key is 32-byte urlsafe base64 encoded
            try:
                self.fernet = Fernet(key_str.encode())
            except Exception:
                # If it's a raw string, derive a proper key from it
                salt = b'nexus_salt_' # In a real app, this should be consistent
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=salt,
                    iterations=100000,
                )
                key = base64.urlsafe_b64encode(kdf.derive(key_str.encode()))
                self.fernet = Fernet(key)

    def encrypt(self, data: str) -> str:
        if not data:
            return ""
        return self.fernet.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        if not encrypted_data:
            return ""
        try:
            return self.fernet.decrypt(encrypted_data.encode()).decode()
        except Exception as e:
            print(f"[ERROR] Decryption failed: {e}")
            return ""

security_manager = SecurityManager()
