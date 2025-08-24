import React, { useState, useEffect } from "react";
import { auth } from "../firebaseConfig";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup,
  getIdToken,
} from "firebase/auth";
import "./App.css";
import google from "./img/google_icon-removebg-preview.png";
import apple from "./img/apple-icon.png";

const BSignup = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [usePhone, setUsePhone] = useState(false);

  // --- 2FA states ---
  const [backendEmail, setBackendEmail] = useState(""); 
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [twofaCode, setTwofaCode] = useState("");

  // 🔹 Verify Firebase login with FastAPI backend
  const authenticateWithBackend = async (firebaseUser) => {
    try {
      const token = await getIdToken(firebaseUser);
      const res = await fetch("http://localhost:8000/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Auth failed");

      setBackendEmail(data.email);
      setTotpEnabled(data.totp_enabled);
      return data;
    } catch (err) {
      console.error(err);
      setError("Backend auth failed: " + err.message);
    }
  };

  // 🔹 Enable Google Authenticator (get QR from backend)
  const enableTOTP = async () => {
    try {
      const res = await fetch("http://localhost:8000/auth/enable-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: backendEmail, code: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
        data.uri
      )}&size=200x200`;
      setQrCodeUrl(qrUrl);
      setTotpEnabled(true);
    } catch (err) {
      console.error(err);
      setError("Enable TOTP failed: " + err.message);
    }
  };

  // 🔹 Verify TOTP code
  const verifyTOTP = async () => {
    try {
      const res = await fetch("http://localhost:8000/auth/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: backendEmail, code: twofaCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      alert("✅ " + data.message);
      setTwofaCode("");
    } catch (err) {
      console.error(err);
      setError("TOTP failed: " + err.message);
    }
  };

  // --- Setup invisible reCAPTCHA once ---
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
          callback: () => console.log("reCAPTCHA solved ✅"),
          "expired-callback": () =>
            console.warn("reCAPTCHA expired. Please retry."),
        }
      );
    }
  };

  // --- Magic link settings ---
  const actionCodeSettings = {
    url: "http://localhost:5173",
    handleCodeInApp: true,
  };

  // --- Send magic link ---
  const handleEmailMagicLink = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.includes("@")) return setError("Please enter a valid email");
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      alert("📩 Magic link sent!");
    } catch (err) {
      setError(err.message);
    }
  };

  // --- Send OTP ---
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!phone.startsWith("+")) {
      setError("Phone number must include country code, e.g. +2348012345678");
      return;
    }
    try {
      setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(
        auth,
        phone,
        window.recaptchaVerifier
      );
      setConfirmationResult(confirmation);
      alert("📲 OTP sent!");
    } catch (err) {
      setError(err.message);
    }
  };

  // --- Verify OTP ---
  const verifyOtp = async () => {
    try {
      const result = await confirmationResult.confirm(otp);
      alert("✅ Phone verified!");
      setOtp("");
      setConfirmationResult(null);
      await authenticateWithBackend(result.user);
    } catch (err) {
      setError("Invalid OTP. Try again.");
    }
  };

  // --- Handle magic link login ---
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem("emailForSignIn");
      if (!email) email = window.prompt("Enter your email to confirm");
      signInWithEmailLink(auth, email, window.location.href)
        .then(async (result) => {
          alert("✅ Email link verified: " + result.user.email);
          window.localStorage.removeItem("emailForSignIn");
          await authenticateWithBackend(result.user);
        })
        .catch(() => setError("Email verification failed"));
    }
  }, []);

  // --- Google sign in ---
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      alert("✅ Google login success: " + result.user.displayName);
      await authenticateWithBackend(result.user);
    } catch (err) {
      setError("Google login failed: " + err.message);
    }
  };

  return (
    <div className="container">
      <form>
        <h2>MFA PROJECT</h2>
        <div className="b_form">
          {/* --- Toggle between email and phone --- */}
          {!usePhone ? (
            <>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  className="input_field"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button className="submit" onClick={handleEmailMagicLink}>
                Send Magic Link
              </button>
              <p>
                Prefer phone?{" "}
                <span
                  style={{ color: "blue", cursor: "pointer" }}
                  onClick={() => setUsePhone(true)}
                >
                  Sign up with phone
                </span>
              </p>
            </>
          ) : (
            <>
              <label>
                <span>Phone Number</span>
                <input
                  type="tel"
                  placeholder="+234 8012345678"
                  value={phone}
                  className="input_field"
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <button className="submit" onClick={handleSendOtp}>
                Send OTP
              </button>

              {confirmationResult && (
                <div style={{ marginTop: "15px" }}>
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <button type="button" onClick={verifyOtp}>
                    Verify OTP
                  </button>
                </div>
              )}

              <p>
                Prefer email?{" "}
                <span
                  style={{ color: "blue", cursor: "pointer" }}
                  onClick={() => setUsePhone(false)}
                >
                  Sign up with email
                </span>
              </p>
            </>
          )}

          {error && <p style={{ color: "red" }}>{error}</p>}
          <div id="recaptcha-container"></div>

          <span className="hr">
            <hr /> or <hr />
          </span>

          {/* Google + Apple login */}
          <button type="button" onClick={handleGoogleSignIn}>
            <img src={google} className="btn_img" alt="Google" /> Continue with Google
          </button>
          <button type="button">
            <img src={apple} className="btn_img" alt="Apple" /> Continue with Apple
          </button>

          {/* --- TOTP Section --- */}
          {backendEmail && !totpEnabled && (
            <div style={{ marginTop: "20px" }}>
              <p>Want extra protection?</p>
              <button type="button" onClick={enableTOTP}>
                Enable Google Authenticator (2FA)
              </button>
            </div>
          )}

          {qrCodeUrl && (
            <div style={{ marginTop: "20px" }}>
              <p>Scan this QR code in Google Authenticator:</p>
              <img src={qrCodeUrl} alt="QR Code" />
            </div>
          )}

          {backendEmail && totpEnabled && (
            <div style={{ marginTop: "20px" }}>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={twofaCode}
                onChange={(e) => setTwofaCode(e.target.value)}
              />
              <button type="button" onClick={verifyTOTP}>
                Verify 2FA
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default BSignup;
