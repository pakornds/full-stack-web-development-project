import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  registerUser,
  registerWithGoogle,
  RegisterFormData,
} from "../services/authService";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    if (!password) return 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 15) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*?]/.test(password)) score += 1;
    return score;
  };

  const getStrengthColor = (score: number) => {
    if (score <= 2) return "#ff4d4d"; // Weak
    if (score <= 4) return "#ffa64d"; // Medium
    if (score === 5) return "#b3ff66"; // Good
    return "#00cc44"; // Strong
  };

  const getStrengthLabel = (score: number) => {
    if (score === 0) return "";
    if (score <= 2) return "Weak";
    if (score <= 4) return "Fair";
    if (score === 5) return "Good";
    return "Strong";
  };

  const passwordScore = calculatePasswordStrength(formData.password);

  const handleGoogleLogin = async () => {
    try {
      await registerWithGoogle();
      // DO NOT navigate here, because registerWithGoogle redirects the browser to Google!
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
      setError(`Google OAuth failed: ${message}`);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await registerUser(formData);
      navigate("/dashboard/personal");
    } catch (err) {
      const axiosError = err as {
        response?: { data?: { message?: string | string[] } };
      };
      const errorMessage = axiosError.response?.data?.message;

      if (Array.isArray(errorMessage)) {
        setError(errorMessage.join(" | "));
      } else {
        setError(errorMessage ?? "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Create an Account</h1>
        <p>Register to access your secure dashboard.</p>

        {error && (
          <p className="error-text" style={{ marginBottom: "15px" }}>
            {error}
          </p>
        )}

        <form onSubmit={handleRegister} className="register-form">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <div style={{ position: "relative", marginBottom: "15px" }}>
            <input
              type="password"
              name="password"
              placeholder="Secure Password (Min 15 chars)"
              value={formData.password}
              onChange={handleChange}
              required
              style={{ width: "100%", boxSizing: "border-box", marginBottom: "5px" }}
            />
            {formData.password.length > 0 && (
              <div style={{ marginTop: "5px" }}>
                <div
                  style={{
                    height: "6px",
                    width: "100%",
                    backgroundColor: "#e0e0e0",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(passwordScore / 6) * 100}%`,
                      backgroundColor: getStrengthColor(passwordScore),
                      transition: "width 0.3s ease, background-color 0.3s ease",
                    }}
                  ></div>
                </div>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "4px", textAlign: "right" }}>
                  Strength: {getStrengthLabel(passwordScore)}
                </div>
              </div>
            )}
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="google-btn"
        >
          <img
            src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg"
            alt="Google Logo"
          />
          <span>Register with Google</span>
        </button>

        <p
          style={{
            marginTop: "20px",
            color: "var(--text-muted)",
            fontSize: "14px",
          }}
        >
          Already have an account?{" "}
          <Link
            to="/login"
            style={{
              color: "var(--primary)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
