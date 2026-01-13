// src/components/PaymentForm.jsx
import { useState } from "react";
import "./PaymentForm.css";

export default function PaymentForm({ paymentMethod, onPaymentDataChange }) {
  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardName: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
  });

  const [errors, setErrors] = useState({});

  // Format card number with spaces (4 digits at a time)
  function formatCardNumber(value) {
    const cleaned = value.replace(/\s/g, "").replace(/\D/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  }

  // Detect card type based on number
  function detectCardType(number) {
    const cleaned = number.replace(/\s/g, "");
    if (/^4/.test(cleaned)) return "visa";
    if (/^5[1-5]/.test(cleaned)) return "mastercard";
    if (/^3[47]/.test(cleaned)) return "amex";
    if (/^6(?:011|5)/.test(cleaned)) return "discover";
    return "unknown";
  }

  function handleCardNumberChange(value) {
    const formatted = formatCardNumber(value);
    setCardData((prev) => ({ ...prev, cardNumber: formatted }));
    validateCardNumber(formatted);

    // Pass data to parent
    if (onPaymentDataChange) {
      onPaymentDataChange({
        ...cardData,
        cardNumber: formatted,
        cardType: detectCardType(formatted),
      });
    }
  }

  function handleCardNameChange(value) {
    // Only allow letters and spaces
    const cleaned = value.replace(/[^a-zA-Z\s]/g, "").toUpperCase();
    setCardData((prev) => ({ ...prev, cardName: cleaned }));

    if (onPaymentDataChange) {
      onPaymentDataChange({ ...cardData, cardName: cleaned });
    }
  }

  function handleExpiryMonthChange(value) {
    // Only allow 2 digits, 01-12
    const cleaned = value.replace(/\D/g, "").substring(0, 2);
    setCardData((prev) => ({ ...prev, expiryMonth: cleaned }));
    validateExpiry(cleaned, cardData.expiryYear);

    if (onPaymentDataChange) {
      onPaymentDataChange({ ...cardData, expiryMonth: cleaned });
    }
  }

  function handleExpiryYearChange(value) {
    // Only allow 2 digits for year
    const cleaned = value.replace(/\D/g, "").substring(0, 2);
    setCardData((prev) => ({ ...prev, expiryYear: cleaned }));
    validateExpiry(cardData.expiryMonth, cleaned);

    if (onPaymentDataChange) {
      onPaymentDataChange({ ...cardData, expiryYear: cleaned });
    }
  }

  function handleCvvChange(value) {
    const cleaned = value.replace(/\D/g, "").substring(0, 4);
    setCardData((prev) => ({ ...prev, cvv: cleaned }));
    validateCvv(cleaned);

    if (onPaymentDataChange) {
      onPaymentDataChange({ ...cardData, cvv: cleaned });
    }
  }

  function validateCardNumber(number) {
    const cleaned = number.replace(/\s/g, "");
    const errors = {};

    if (!cleaned) {
      errors.cardNumber = "Card number is required";
    } else if (cleaned.length < 13 || cleaned.length > 16) {
      errors.cardNumber = "Card number must be 13-16 digits";
    } else if (!luhnCheck(cleaned)) {
      errors.cardNumber = "Invalid card number";
    }

    setErrors((prev) => ({ ...prev, cardNumber: errors.cardNumber }));
    return !errors.cardNumber;
  }

  function validateExpiry(month, year) {
    const errors = {};
    const monthNum = parseInt(month);
    const yearNum = parseInt("20" + year);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (!month || !year) {
      errors.expiry = "Expiry date is required";
    } else if (monthNum < 1 || monthNum > 12) {
      errors.expiry = "Invalid month";
    } else if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
      errors.expiry = "Card has expired";
    }

    setErrors((prev) => ({ ...prev, expiry: errors.expiry }));
    return !errors.expiry;
  }

  function validateCvv(cvv) {
    const errors = {};

    if (!cvv) {
      errors.cvv = "CVV is required";
    } else if (cvv.length < 3 || cvv.length > 4) {
      errors.cvv = "CVV must be 3-4 digits";
    }

    setErrors((prev) => ({ ...prev, cvv: errors.cvv }));
    return !errors.cvv;
  }

  // Luhn algorithm for card number validation
  function luhnCheck(cardNumber) {
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  const cardType = detectCardType(cardData.cardNumber);

  // Render different forms based on payment method
  if (paymentMethod === "card") {
    return (
      <div className="payment-form-container">
        <div className="payment-form-header">
          <h3>Card Details</h3>
          <div className="card-logos">
            <img
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='25' viewBox='0 0 40 25'%3E%3Crect width='40' height='25' rx='3' fill='%231434CB'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Arial' font-size='10' font-weight='bold'%3EVISA%3C/text%3E%3C/svg%3E"
              alt="Visa"
              className={`card-logo ${cardType === "visa" ? "active" : ""}`}
            />
            <img
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='25' viewBox='0 0 40 25'%3E%3Crect width='40' height='25' rx='3' fill='%23EB001B'/%3E%3Ccircle cx='15' cy='12.5' r='8' fill='%23FF5F00'/%3E%3Ccircle cx='25' cy='12.5' r='8' fill='%23F79E1B'/%3E%3C/svg%3E"
              alt="Mastercard"
              className={`card-logo ${cardType === "mastercard" ? "active" : ""}`}
            />
          </div>
        </div>

        <div className="payment-form">
          {/* Card Number */}
          <div className="form-group">
            <label htmlFor="cardNumber">
              Card Number <span className="required">*</span>
            </label>
            <input
              id="cardNumber"
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardData.cardNumber}
              onChange={(e) => handleCardNumberChange(e.target.value)}
              onBlur={() => validateCardNumber(cardData.cardNumber)}
              className={errors.cardNumber ? "error" : cardData.cardNumber ? "success" : ""}
              maxLength={19}
            />
            {errors.cardNumber && <span className="error-message">{errors.cardNumber}</span>}
          </div>

          {/* Card Name */}
          <div className="form-group">
            <label htmlFor="cardName">
              Cardholder Name <span className="required">*</span>
            </label>
            <input
              id="cardName"
              type="text"
              placeholder="JOHN DOE"
              value={cardData.cardName}
              onChange={(e) => handleCardNameChange(e.target.value)}
              className={cardData.cardName ? "success" : ""}
            />
          </div>

          {/* Expiry and CVV Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expiryMonth">
                Expiry Date <span className="required">*</span>
              </label>
              <div className="expiry-inputs">
                <input
                  id="expiryMonth"
                  type="text"
                  placeholder="MM"
                  value={cardData.expiryMonth}
                  onChange={(e) => handleExpiryMonthChange(e.target.value)}
                  onBlur={() => validateExpiry(cardData.expiryMonth, cardData.expiryYear)}
                  className={errors.expiry ? "error" : cardData.expiryMonth ? "success" : ""}
                  maxLength={2}
                />
                <span className="expiry-separator">/</span>
                <input
                  id="expiryYear"
                  type="text"
                  placeholder="YY"
                  value={cardData.expiryYear}
                  onChange={(e) => handleExpiryYearChange(e.target.value)}
                  onBlur={() => validateExpiry(cardData.expiryMonth, cardData.expiryYear)}
                  className={errors.expiry ? "error" : cardData.expiryYear ? "success" : ""}
                  maxLength={2}
                />
              </div>
              {errors.expiry && <span className="error-message">{errors.expiry}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="cvv">
                CVV <span className="required">*</span>
              </label>
              <input
                id="cvv"
                type="text"
                placeholder="123"
                value={cardData.cvv}
                onChange={(e) => handleCvvChange(e.target.value)}
                onBlur={() => validateCvv(cardData.cvv)}
                className={errors.cvv ? "error" : cardData.cvv ? "success" : ""}
                maxLength={4}
              />
              {errors.cvv && <span className="error-message">{errors.cvv}</span>}
            </div>
          </div>

          {/* Security Badge */}
          <div className="security-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Your payment information is encrypted and secure</span>
          </div>
        </div>
      </div>
    );
  }

  if (paymentMethod === "cash") {
    return (
      <div className="payment-info-box cash">
        <div className="payment-info-icon">💵</div>
        <h3>Cash on Delivery</h3>
        <p>You will pay when your order is delivered to your address.</p>
        <ul>
          <li>Payment accepted in cash only</li>
          <li>Please have exact change ready</li>
          <li>Receipt will be provided by the delivery person</li>
        </ul>
      </div>
    );
  }

  if (paymentMethod === "bank") {
    return (
      <div className="payment-info-box bank">
        <div className="payment-info-icon">🏦</div>
        <h3>Bank Transfer</h3>
        <p>Please transfer the total amount to the following bank account:</p>
        <div className="bank-details">
          <div className="bank-detail-row">
            <span className="label">Bank Name:</span>
            <span className="value">CS308 Bank</span>
          </div>
          <div className="bank-detail-row">
            <span className="label">Account Name:</span>
            <span className="value">CS308 E-Commerce Ltd.</span>
          </div>
          <div className="bank-detail-row">
            <span className="label">Account Number:</span>
            <span className="value">1234567890</span>
          </div>
          <div className="bank-detail-row">
            <span className="label">IBAN:</span>
            <span className="value">TR33 0006 1005 1978 6457 8413 26</span>
          </div>
          <div className="bank-detail-row">
            <span className="label">Reference:</span>
            <span className="value">Your Order ID (will be shown after order)</span>
          </div>
        </div>
        <div className="bank-note">
          <strong>Note:</strong> Your order will be processed after we receive your payment.
          Please allow 1-2 business days for verification.
        </div>
      </div>
    );
  }

  return null;
}
