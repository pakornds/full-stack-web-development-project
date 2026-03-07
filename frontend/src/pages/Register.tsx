import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const handleGoogleLogin = async () => {
    try {
      await registerWithGoogle();
      navigate("/dashboard");
    } catch (err) {
      console.error("OAuth Error:", err);
      const message =
        err instanceof Error ? err.message : "Window closed or access denied";
      setError(`Google OAuth failed: ${message}`);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await registerUser(formData);
      navigate("/dashboard");
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(
        axiosError.response?.data?.message ??
          "Registration failed. Please try again.",
      );
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
          <input
            type="password"
            name="password"
            placeholder="Secure Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
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
            src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
            alt="Google Logo"
          />
          Register with Google
        </button>
      </div>
    </div>
  );
};

export default Register;
