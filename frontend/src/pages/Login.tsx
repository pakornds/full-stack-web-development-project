import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  loginUser,
  loginWithGoogle,
  verifyTwoFactorLogin,
  LoginFormData,
  forgotPassword,
  resetPassword,
} from "../services/authService";

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [view, setView] = useState<"login" | "forgot" | "reset">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // 2FA state
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      setError("Google login failed");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await loginUser(formData);

      if (response.requiresTwoFactor && response.tempToken) {
        setTempToken(response.tempToken);
        setShowTwoFactor(true);
        setLoading(false);
        return;
      }

      navigate("/dashboard/personal");
      setLoading(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const responseMessage = err.response?.data?.message;
        if (Array.isArray(responseMessage)) {
          setError(responseMessage.join(", "));
        } else if (typeof responseMessage === "string") {
          setError(responseMessage);
        } else {
          setError("Invalid email or password.");
        }
      } else {
        setError("Invalid email or password.");
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await forgotPassword(forgotEmail);
      setMessage(res.message);
      setView("reset");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await resetPassword(resetToken, newPassword);
      setMessage(res.message);
      setResetToken("");
      setNewPassword("");
      setView("login");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await verifyTwoFactorLogin(tempToken, twoFactorCode);
      navigate("/dashboard/personal");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const responseMessage = err.response?.data?.message;
        if (typeof responseMessage === "string") {
          setError(responseMessage);
        } else {
          setError("Invalid 2FA code. Please try again.");
        }
      } else {
        setError("Invalid 2FA code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── 2FA Verification Screen ───────────────────────────────
  if (showTwoFactor) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="two-factor-icon">🔐</div>
          <h1>Two-Factor Authentication</h1>
          <p>Enter the 6-digit code from your authenticator app.</p>

          {error && <div className="login-error-box">{error}</div>}

          <form onSubmit={handleTwoFactorVerify} className="register-form">
            <input
              type="text"
              value={twoFactorCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setTwoFactorCode(val);
              }}
              placeholder="000000"
              className="otp-input"
              maxLength={6}
              autoFocus
              required
            />
            <button
              type="submit"
              className="submit-btn"
              disabled={loading || twoFactorCode.length !== 6}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </form>

          <button
            onClick={() => {
              setShowTwoFactor(false);
              setTwoFactorCode("");
              setTempToken("");
              setError("");
            }}
            className="back-link-btn"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ─── Normal Login Screen ───────────────────────────────────
  return (
    <div className="login-container">
      <div className="login-card">
        {view === "login" && (
          <>
            <h1>Welcome Back</h1>
            <p>Sign in to access your secure dashboard.</p>
          </>
        )}
        {view === "forgot" && (
          <>
            <h1>Forgot Password</h1>
            <p>Enter your email to receive a reset link.</p>
          </>
        )}
        {view === "reset" && (
          <>
            <h1>Reset Password</h1>
            <p>Enter the token from your email and your new password.</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px" }}>
              (Check backend console for the demo reset token)
            </p>
          </>
        )}

        {message && <div style={{ background: "#d4edda", color: "#155724", padding: "10px", borderRadius: "4px", marginBottom: "15px" }}>{message}</div>}
        {error && <div className="login-error-box">{error}</div>}

        {view === "login" && (
          <>
            <button onClick={handleGoogleLogin} type="button" className="google-btn" style={{ marginBottom: "20px" }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google Logo" />
              Continue with Google
            </button>

            <div className="divider"><span>OR</span></div>

            <form onSubmit={handleLogin} className="register-form">
              <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required />
              <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
              <div>
                Don't have an account? {' '}
                <Link to="/register" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>Create one</Link>
              </div>
              <button type="button" onClick={() => { setView("forgot"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                Forgot Password?
              </button>
            </div>
          </>
        )}

        {view === "forgot" && (
          <form onSubmit={handleForgotPassword} className="register-form">
            <input type="email" placeholder="Email Address" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <button type="button" onClick={() => { setView("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "var(--text-muted)", marginTop: "10px", cursor: "pointer", textDecoration: "underline" }}>
              Back to Login
            </button>
          </form>
        )}

        {view === "reset" && (
          <form onSubmit={handleResetPassword} className="register-form">
            <input type="text" placeholder="Reset Token" value={resetToken} onChange={(e) => setResetToken(e.target.value)} required />
            <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            <button type="button" onClick={() => { setView("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "var(--text-muted)", marginTop: "10px", cursor: "pointer", textDecoration: "underline" }}>
              Back to Login
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;
