// frontend/src/components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  // Only check for the access_token. 
  // The refresh_token is an httpOnly cookie and not accessible here.
  // The axios interceptor will handle refreshing if the access_token is expired.
  const access = localStorage.getItem("access_token");

  return access ? children : <Navigate to="/login" />;
}