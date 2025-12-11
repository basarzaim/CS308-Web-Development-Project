import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
// ESKİ: updateUserProfile ../api/users'tan geliyordu
// import { updateUserProfile } from "../api/users";
import { getProfile, updateProfile } from "../services/auth";
import "./Profile.css";

export default function Profile() {
  const { user, isAuthenticated, updateUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // profil ilk yüklenirken
  const [loading, setLoading] = useState(false); // form kaydederken
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
  });

  // Profil bilgisini backend'den çek
  useEffect(() => {
    if (!isAuthenticated) {
      setInitialLoading(false);
      return;
    }

    let active = true;
    setError("");
    setSuccess("");
    setInitialLoading(true);

    getProfile()
      .then((data) => {
        if (!active) return;

        // Formu doldur
        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          address: data.address || "",
        });

        // Context'teki user bilgisini de güncelle
        if (updateUser) {
          updateUser(data);
        }
      })
      .catch((err) => {
        if (!active) return;
        const r = err?.response;
        setError(
          r?.data?.detail ||
            r?.data?.message ||
            err.message ||
            "Failed to load profile."
        );
      })
      .finally(() => {
        if (active) setInitialLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, updateUser]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      setLoading(true);
      // ESKİ: updateUserProfile(formData)
      const updatedData = await updateProfile(formData);
      if (updateUser) {
        updateUser(updatedData);
      }
      setSuccess("Profile updated successfully");
      setEditing(false);
    } catch (err) {
      const r = err?.response;
      setError(
        r?.data?.detail ||
          r?.data?.message ||
          err.message ||
          "Failed to update profile."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
        address: user.address || "",
      });
    }
    setEditing(false);
    setError("");
    setSuccess("");
  };

  if (!isAuthenticated) {
    return (
      <div className="profile-page">
        <div className="profile-header">
          <h1>My Profile</h1>
        </div>
        <div className="alert error">Please log in to view your profile.</div>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="profile-page">
        <div className="profile-header">
          <h1>My Profile</h1>
        </div>
        <p>Loading your profile…</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-section">
            <h2>Account Information</h2>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{user?.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Username:</span>
              <span className="info-value">{user?.username}</span>
            </div>
          </div>

          <div className="profile-section">
            <div className="section-header">
              <h2>Personal Information</h2>
              {!editing && (
                <button
                  className="btn-secondary"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSubmit} className="profile-form">
                <label>
                  First Name
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Enter your first name"
                  />
                </label>

                <label>
                  Last Name
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Enter your last name"
                  />
                </label>

                <label>
                  Phone Number
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                  />
                </label>

                <label>
                  Address
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter your address"
                    rows="3"
                  />
                </label>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="info-display">
                <div className="info-row">
                  <span className="info-label">First Name:</span>
                  <span className="info-value">
                    {user?.first_name || "Not set"}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Last Name:</span>
                  <span className="info-value">
                    {user?.last_name || "Not set"}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone:</span>
                  <span className="info-value">
                    {user?.phone || "Not set"}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Address:</span>
                  <span className="info-value">
                    {user?.address || "Not set"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="profile-section">
            <h2>Quick Links</h2>
            <div className="quick-links">
              <a href="/orders" className="quick-link">
                View My Orders
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
