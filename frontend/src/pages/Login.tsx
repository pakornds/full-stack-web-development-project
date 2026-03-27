import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  loginUser,
  loginWithGoogle,
  verifyTwoFactorLogin,
  LoginFormData,
} from "../services/authService";

const Login: React.FC = () => {
  const navigate = useNavigate();
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
      console.error("OAuth Error:", err);
      let message = "Window closed or access denied";
      if (err instanceof Error) {
        message = err.message;
      } else if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
      ) {
        message = (err as { message: string }).message;
      }
      setError(`Google login failed: ${message}`);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await loginUser(formData);

      if (response.requiresTwoFactor && response.tempToken) {
        setTempToken(response.tempToken);
        setShowTwoFactor(true);
        setLoading(false);
        return;
      }

      navigate("/dashboard");
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
      navigate("/dashboard");
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
        <h1>Welcome Back</h1>
        <p>Sign in to access your secure dashboard.</p>

        {error && <div className="login-error-box">{error}</div>}

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="google-btn"
          style={{ marginBottom: "20px" }}
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
            alt="Google Logo"
          />
          Continue with Google
        </button>

        <div className="divider">
          <span>OR</span>
        </div>

        <form onSubmit={handleLogin} className="register-form">
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p
          style={{
            marginTop: "20px",
            color: "var(--text-muted)",
            fontSize: "14px",
          }}
        >
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            style={{
              color: "var(--primary)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
