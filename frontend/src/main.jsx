import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <ToastContainer
        position="top-right"
        autoClose={2800}
        hideProgressBar
        newestOnTop
        closeOnClick
        toastClassName="!rounded-xl2 !font-sans !text-sm"
      />
    </AuthProvider>
  </StrictMode>
);
