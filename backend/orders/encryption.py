"""
Encryption utilities for sensitive data (credit cards, etc.)
Uses Fernet symmetric encryption from the cryptography library.
"""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from django.conf import settings


def get_encryption_key():
    """
    Get or generate encryption key from settings or environment variable.
    In production, this should be set as an environment variable.
    """
    # Try to get from settings first
    key = getattr(settings, 'ENCRYPTION_KEY', None)
    
    # If not in settings, try environment variable
    if not key:
        key = os.getenv('ENCRYPTION_KEY')
    
    # If still not found, generate one (for development only - NOT for production!)
    if not key:
        # WARNING: This is for development only. In production, you MUST set ENCRYPTION_KEY
        # Generate a key and store it securely
        key = Fernet.generate_key().decode()
        print("WARNING: Generated encryption key for development. Set ENCRYPTION_KEY in production!")
    
    # Ensure key is bytes
    if isinstance(key, str):
        key = key.encode()
    
    return key


def get_cipher():
    """Get Fernet cipher instance for encryption/decryption"""
    key = get_encryption_key()
    return Fernet(key)


def encrypt_data(data):
    """
    Encrypt sensitive data.
    
    Args:
        data: String or bytes to encrypt
        
    Returns:
        Encrypted data as base64-encoded string
    """
    if not data:
        return None
    
    try:
        cipher = get_cipher()
        if isinstance(data, str):
            data = data.encode('utf-8')
        encrypted = cipher.encrypt(data)
        return base64.b64encode(encrypted).decode('utf-8')
    except Exception as e:
        # Log error but don't expose sensitive information
        raise ValueError("Failed to encrypt data securely")


def decrypt_data(encrypted_data):
    """
    Decrypt sensitive data.
    
    Args:
        encrypted_data: Base64-encoded encrypted string
        
    Returns:
        Decrypted data as string
    """
    if not encrypted_data:
        return None
    
    try:
        cipher = get_cipher()
        encrypted_bytes = base64.b64decode(encrypted_data.encode('utf-8'))
        decrypted = cipher.decrypt(encrypted_bytes)
        return decrypted.decode('utf-8')
    except Exception as e:
        # Log error but don't expose sensitive information
        raise ValueError("Failed to decrypt data securely")


def mask_credit_card(card_number):
    """
    Mask credit card number, showing only last 4 digits.
    
    Args:
        card_number: Full credit card number
        
    Returns:
        Masked card number (e.g., "**** **** **** 1234")
    """
    if not card_number:
        return None
    
    # Remove any spaces or dashes
    card_number = str(card_number).replace(' ', '').replace('-', '')
    
    if len(card_number) < 4:
        return "****"
    
    last_four = card_number[-4:]
    return f"**** **** **** {last_four}"


def get_last_four_digits(card_number):
    """Extract last 4 digits from credit card number"""
    if not card_number:
        return None
    
    card_number = str(card_number).replace(' ', '').replace('-', '')
    if len(card_number) < 4:
        return None
    
    return card_number[-4:]


def validate_credit_card_format(card_number):
    """
    Validate credit card number format using Luhn algorithm.
    
    Args:
        card_number: Credit card number as string
        
    Returns:
        Tuple (is_valid, error_message)
    """
    if not card_number:
        return False, "Credit card number is required"
    
    # Remove spaces and dashes
    card_number = str(card_number).replace(' ', '').replace('-', '')
    
    # Check if all digits
    if not card_number.isdigit():
        return False, "Credit card number must contain only digits"
    
    # Check length (typically 13-19 digits)
    if len(card_number) < 13 or len(card_number) > 19:
        return False, "Credit card number must be between 13 and 19 digits"
    
    # Luhn algorithm validation
    def luhn_check(card_num):
        def digits_of(n):
            return [int(d) for d in str(n)]
        
        digits = digits_of(card_num)
        odd_digits = digits[-1::-2]
        even_digits = digits[-2::-2]
        checksum = sum(odd_digits)
        for d in even_digits:
            checksum += sum(digits_of(d * 2))
        return checksum % 10 == 0
    
    if not luhn_check(card_number):
        return False, "Invalid credit card number (failed Luhn check)"
    
    return True, None


def validate_cvv(cvv):
    """Validate CVV format (3-4 digits)"""
    if not cvv:
        return False, "CVV is required"
    
    cvv_str = str(cvv).strip()
    if not cvv_str.isdigit():
        return False, "CVV must contain only digits"
    
    if len(cvv_str) not in [3, 4]:
        return False, "CVV must be 3 or 4 digits"
    
    return True, None


def validate_expiry_date(month, year):
    """Validate expiry date format and that it's not in the past"""
    from datetime import datetime
    
    try:
        month_int = int(month)
        year_int = int(year)
        
        if month_int < 1 or month_int > 12:
            return False, "Invalid month (must be 1-12)"
        
        # Handle 2-digit years (assume 20xx)
        if year_int < 100:
            year_int += 2000
        
        # Check if date is in the past
        expiry_date = datetime(year_int, month_int, 1)
        current_date = datetime.now()
        
        if expiry_date < current_date:
            return False, "Credit card has expired"
        
        return True, None
    except (ValueError, TypeError):
        return False, "Invalid expiry date format"
