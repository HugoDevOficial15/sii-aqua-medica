import Swal from "sweetalert2";

const baseConfig = {
  borderRadius: "16px",
  padding: "2rem",
  background: "#1e293b",
  color: "#f8fafc",
  confirmButtonColor: "#0d6efd",
  confirmButtonText: "Aceptar",
  didOpen: (modal) => {
    const titleElement = modal.querySelector(".swal2-title");
    const htmlElement = modal.querySelector(".swal2-html-container");
    if (titleElement) titleElement.style.color = "#f8fafc";
    if (htmlElement) htmlElement.style.color = "#cbd5e1";
  }
};

export const notifySuccess = (title, text) => {
  Swal.fire({
    ...baseConfig,
    icon: "success",
    iconColor: "#10b981",
    title: title,
    text: text
  });
};

export const notifyError = (title, text) => {
  Swal.fire({
    ...baseConfig,
    icon: "error",
    iconColor: "#ef4444",
    title: title,
    text: text,
    confirmButtonColor: "#ef4444"
  });
};

export const notifyWarning = (title, text) => {
  Swal.fire({
    ...baseConfig,
    icon: "warning",
    iconColor: "#f59e0b",
    title: title,
    text: text,
    confirmButtonColor: "#f59e0b"
  });
};

export const notifyInfo = (title, text) => {
  Swal.fire({
    ...baseConfig,
    icon: "info",
    iconColor: "#3b82f6",
    title: title,
    text: text,
    confirmButtonColor: "#3b82f6"
  });
};