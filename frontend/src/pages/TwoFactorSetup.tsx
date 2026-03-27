import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  generateTwoFactorSecret,
  enableTwoFactor,
  disableTwoFactor,
  getDashboardData,
  TwoFactorSetupData,
  UserData,
} from "../services/authService";

const TwoFactorSetup: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getDashboardData();
        setUser(userData);
      } catch {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  const handleGenerate = async () => {
    setError("");
    setMessage("");
    setActionLoading(true);
    try {
      const data = await generateTwoFactorSecret();
      setSetupData(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Failed to generate 2FA secret";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setActionLoading(true);
    try {
      const result = await enableTwoFactor(code);
      setMessage(result.message);
      setSetupData(null);
      setCode("");
      // Refresh user data
      const userData = await getDashboardData();
      setUser(userData);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid code";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setActionLoading(true);
    try {
      const result = await disableTwoFactor(disableCode);
      setMessage(result.message);
      setShowDisable(false);
      setDisableCode("");
      const userData = await getDashboardData();
      setUser(userData);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid code";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card twofa-card">
        <h1>🔐 Two-Factor Authentication</h1>

        {/* Status Badge */}
        <div
          className={`twofa-status ${user?.twoFactorEnabled ? "twofa-enabled" : "twofa-disabled"}`}
        >
          {user?.twoFactorEnabled ? "✅ Enabled" : "❌ Disabled"}
        </div>

        {message && <div className="twofa-success-box">{message}</div>}
        {error && <div className="login-error-box">{error}</div>}

        {/* ─── If 2FA is NOT enabled ─── */}
        {!user?.twoFactorEnabled && !setupData && (
          <div className="twofa-section">
            <p className="twofa-description">
              Add an extra layer of security to your account. You&apos;ll need
              an authenticator app like{" "}
              <strong>Google Authenticator</strong> or <strong>Authy</strong>.
            </p>
            <button
              onClick={handleGenerate}
              className="submit-btn"
              disabled={actionLoading}
            >
              {actionLoading ? "Generating..." : "Set Up 2FA"}
            </button>
          </div>
        )}

        {/* ─── QR Code Setup Step ─── */}
        {setupData && (
          <div className="twofa-section">
            <p className="twofa-description">
              Scan this QR code with your authenticator app:
            </p>

            <div className="qr-code-container">
              <img src={setupData.qrCode} alt="2FA QR Code" className="qr-code-img" />
            </div>

            <div className="secret-box">
              <p className="secret-label">Or enter this code manually:</p>
              <code className="secret-code">{setupData.secret}</code>
            </div>

            <form onSubmit={handleEnable} className="register-form">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(val);
                }}
                placeholder="Enter 6-digit code"
                className="otp-input"
                maxLength={6}
                autoFocus
                required
              />
              <button
                type="submit"
                className="submit-btn"
                disabled={actionLoading || code.length !== 6}
              >
                {actionLoading ? "Verifying..." : "Verify & Enable 2FA"}
              </button>
            </form>

            <button
              onClick={() => {
                setSetupData(null);
                setCode("");
                setError("");
              }}
              className="back-link-btn"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ─── If 2FA IS enabled ─── */}
        {user?.twoFactorEnabled && !showDisable && (
          <div className="twofa-section">
            <p className="twofa-description">
              Your account is protected with two-factor authentication.
            </p>
            <button
              onClick={() => setShowDisable(true)}
              className="logout-btn"
              style={{ width: "100%" }}
            >
              Disable 2FA
            </button>
          </div>
        )}

        {/* ─── Disable 2FA Form ─── */}
        {showDisable && (
          <div className="twofa-section">
            <p className="twofa-description">
              Enter your current 2FA code to disable:
            </p>
            <form onSubmit={handleDisable} className="register-form">
              <input
                type="text"
                value={disableCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setDisableCode(val);
                }}
                placeholder="Enter 6-digit code"
                className="otp-input"
                maxLength={6}
                autoFocus
                required
              />
              <button
                type="submit"
                className="logout-btn"
                style={{ width: "100%" }}
                disabled={actionLoading || disableCode.length !== 6}
              >
                {actionLoading ? "Disabling..." : "Confirm Disable 2FA"}
              </button>
            </form>
            <button
              onClick={() => {
                setShowDisable(false);
                setDisableCode("");
                setError("");
              }}
              className="back-link-btn"
            >
              Cancel
            </button>
          </div>
        )}

        <button onClick={() => navigate("/dashboard")} className="back-link-btn">
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default TwoFactorSetup;
