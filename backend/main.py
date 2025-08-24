from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pyotp
import firebase_admin
from firebase_admin import credentials, auth

from fastapi.middleware.cors import CORSMiddleware

# Init FastAPI
app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Firebase Admin SDK init
cred = credentials.Certificate("serviceAccountKey.json")  # download from Firebase
firebase_admin.initialize_app(cred)

# In-memory DB (replace with Mongo/Postgres later)
users = {}

# ------------------------------
# MODELS
# ------------------------------
class TokenData(BaseModel):
    token: str

class EnableTOTPRequest(BaseModel):
    email: str

class VerifyTOTPRequest(BaseModel):
    email: str
    code: str


# ------------------------------
# ROUTES
# ------------------------------
@app.get("/")
def root():
    return {"message": "FastAPI + Firebase + Google Authenticator 🚀"}


# Step 1: Verify Firebase token
@app.post("/auth/firebase")
def auth_firebase(data: TokenData):
    try:
        decoded_token = auth.verify_id_token(data.token)
        email = decoded_token.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="No email found in token")

        # Ensure user exists in backend DB
        if email not in users:
            users[email] = {
                "totp_secret": pyotp.random_base32(),
                "totp_enabled": False,
            }

        return {
            "success": True,
            "email": email,
            "totp_enabled": users[email]["totp_enabled"],
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


# Step 2: Enable TOTP (generate secret & QR code)
@app.post("/auth/enable-totp")
def enable_totp(data: EnableTOTPRequest):
    if data.email not in users:
        raise HTTPException(status_code=404, detail="User not found")

    secret = pyotp.random_base32()
    users[data.email]["totp_secret"] = secret
    users[data.email]["totp_enabled"] = True

    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=data.email, issuer_name="MFA App"
    )

    return {"secret": secret, "uri": uri}




# Step 3: Verify TOTP during login
@app.post("/auth/verify-totp")
def verify_totp(data: VerifyTOTPRequest):
    user = users.get(data.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user["totp_enabled"]:
        return {"success": True, "message": "TOTP not required"}

    totp = pyotp.TOTP(user["totp_secret"])
    
    # Allow ±30s drift (1 time step)
    if totp.verify(data.code, valid_window=1):
        return {"success": True, "message": "Login complete ✅"}
    else:
        raise HTTPException(status_code=401, detail="Invalid TOTP code ❌")





# Step 3: Verify TOTP during login
# @app.post("/auth/verify-totp")
# def verify_totp(data: VerifyTOTPRequest):
#     user = users.get(data.email)
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")

#     if not user["totp_enabled"]:
#         return {"success": True, "message": "TOTP not required"}

#     totp = pyotp.TOTP(user["totp_secret"])
#     if totp.verify(data.code):
#         return {"success": True, "message": "Login complete ✅"}
#     else:
#         raise HTTPException(status_code=401, detail="Invalid TOTP code ❌")
