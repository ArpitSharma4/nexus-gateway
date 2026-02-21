import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Fallback key for development — IN PRODUCTION, SET MASTER_ENCRYPTION_KEY
# This must be a 32-byte string, base64 url-safe encoded.
DEFAULT_KEY = base64.urlsafe_b64encode(b"nexus_default_insecure_key_32_ch")

class EncryptionManager:
    def __init__(self):
        key_str = os.getenv("MASTER_ENCRYPTION_KEY")
        if not key_str:
            print("[WARNING] MASTER_ENCRYPTION_KEY not set. Using default insecure key.")
            self.fernet = Fernet(DEFAULT_KEY)
        else:
            # Ensure the key is 32-byte urlsafe base64 encoded
            try:
                # Try loading directly
                self.fernet = Fernet(key_str.encode())
            except Exception:
                # If it's a raw string or wrong length, derive a proper key from it
                print("[INFO] Deriving encryption key from MASTER_ENCRYPTION_KEY...")
                salt = b'nexus_salt_stable' # In a real app, this should be consistent and stored
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=salt,
                    iterations=100000,
                )
                derived_key = base64.urlsafe_b64encode(kdf.derive(key_str.encode()))
                self.fernet = Fernet(derived_key)

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

encryption_manager = EncryptionManager()
