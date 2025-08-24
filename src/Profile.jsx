import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // user data passed from login page
  const user = location.state?.user;

  if (!user) {
    // if no user, redirect back
    navigate("/");
    return null;
  }

  return (
    <div className="container">
      <h2>👤 Profile Page</h2>
      <p><strong>Email:</strong> {user.email}</p>
      {user.displayName && <p><strong>Name:</strong> {user.displayName}</p>}
      {user.phoneNumber && <p><strong>Phone:</strong> {user.phoneNumber}</p>}
      <button onClick={() => navigate("/")}>Logout</button>
    </div>
  );
};

export default Profile;
