import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const access = localStorage.getItem("access_token");
  const refresh = localStorage.getItem("refresh_token");

  return access || refresh ? children : <Navigate to="/login" />;
}
