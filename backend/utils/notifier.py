import urllib.request
import urllib.parse
import base64
import json
import logging
import os
from config import (
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SENDER,
    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER,
    MOCK_OTP
)

logger = logging.getLogger("hellobeauty.notifier")

def send_email_otp(email: str, otp: str):
    logger.info(f"Generating Email OTP for {email}")
    if MOCK_OTP:
        logger.info(f"[MOCK EMAIL OTP] Sent to {email}: {otp}")
        print(f"[REGISTRATION OTP/RESEND] User: {email}, Code: {otp}")
        return
    
    # Check configuration
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD or not SMTP_SENDER:
        err_msg = "SMTP email service is not configured on the server."
        logger.error(f"Failed to send email to {email}: {err_msg}")
        raise ValueError(err_msg)
        
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    
    # Create message
    msg = MIMEMultipart()
    msg['From'] = SMTP_SENDER
    msg['To'] = email
    msg['Subject'] = "Hellobeauty - Email Verification Code"
    
    body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8e5df; border-radius: 10px;">
          <h2 style="color: #c5a059; text-align: center;">Verify Your Account</h2>
          <p>Dear Customer,</p>
          <p>Thank you for registering with Hellobeauty. To complete your registration, please verify your email address using the following 6-digit One-Time Password (OTP):</p>
          <div style="font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 4px; padding: 15px; background-color: #fcfbf9; border: 1px dashed #c5a059; margin: 20px 0; color: #111;">
            {otp}
          </div>
          <p>This verification code is valid for 10 minutes. Please do not share this OTP with anyone.</p>
          <br>
          <hr style="border: 0; border-top: 1px solid #eee;">
          <p style="font-size: 11px; color: #999; text-align: center;">Hellobeauty Store - Avilali, Tirupati, Avilali, Andhra Pradesh 517502</p>
        </div>
      </body>
    </html>
    """
    msg.attach(MIMEText(body, 'html'))
    
    try:
        # Connect to SMTP
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email OTP successfully sent to {email}")
    except Exception as e:
        err_msg = f"SMTP error: {str(e)}"
        logger.error(f"SMTP delivery failed to {email}: {err_msg}")
        raise RuntimeError(err_msg)

def send_sms_otp(phone: str, otp: str):
    logger.info(f"Generating SMS OTP for {phone}")
    if MOCK_OTP:
        logger.info(f"[MOCK SMS OTP] Sent to {phone}: {otp}")
        print(f"[REGISTRATION OTP/RESEND] User: {phone}, Code: {otp}")
        return
        
    # Check configuration
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER:
        err_msg = "SMS gateway (Twilio) is not configured on the server."
        logger.error(f"Failed to send SMS to {phone}: {err_msg}")
        raise ValueError(err_msg)
        
    # Standardize phone number for Twilio
    to_number = phone.strip()
    if not to_number.startswith("+"):
        if len(to_number) == 10:
            to_number = "+91" + to_number
        else:
            to_number = "+" + to_number
            
    message_body = f"Hellobeauty: Your phone verification code is {otp}. Valid for 10 minutes."
    
    # Prepare API Request
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    
    data = {
        "To": to_number,
        "From": TWILIO_PHONE_NUMBER,
        "Body": message_body
    }
    
    encoded_data = urllib.parse.urlencode(data).encode("utf-8")
    auth_str = f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}"
    encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    
    req = urllib.request.Request(
        url,
        data=encoded_data,
        headers={
            "Authorization": f"Basic {encoded_auth}",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as res:
            res_body = res.read().decode("utf-8")
            parsed_res = json.loads(res_body)
            if parsed_res.get("status") in ["queued", "sending", "sent"]:
                logger.info(f"SMS OTP successfully queued/sent to {to_number} (SID: {parsed_res.get('sid')})")
            else:
                raise RuntimeError(f"Twilio returned status: {parsed_res.get('status')}")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            parsed_error = json.loads(error_body)
            error_message = parsed_error.get("message", "Unknown Twilio API error")
            code = parsed_error.get("code", "No code")
            err_msg = f"Twilio API Error [{code}]: {error_message}"
        except:
            err_msg = f"Twilio HTTP {e.code}: {error_body}"
        logger.error(f"SMS delivery failed to {to_number}: {err_msg}")
        raise RuntimeError(err_msg)
    except Exception as e:
        err_msg = f"SMS sender error: {str(e)}"
        logger.error(f"SMS delivery failed to {to_number}: {err_msg}")
        raise RuntimeError(err_msg)
