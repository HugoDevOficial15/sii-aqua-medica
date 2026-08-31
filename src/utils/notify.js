const loadSwal = async () => {
  const module = await import("sweetalert2");
  return module.default;
};

const getDarkMode = () => {
  const htmlElement = document.documentElement;
  const dataTheme = htmlElement.getAttribute("data-theme");

  // Si tiene data-theme="light", es modo claro
  if (dataTheme === "light") return false;
  // Si tiene data-theme="dark", es modo oscuro
  if (dataTheme === "dark") return true;
  // Si no tiene data-theme, revisar preferencia del sistema
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const getThemeColors = () => {
  const isDark = getDarkMode();

  if (isDark) {
    return {
      background: "#1e293b",
      textColor: "#f8fafc",
      subtextColor: "#cbd5e1",
      buttonColor: "#0d6efd"
    };
  } else {
    return {
      background: "#ffffff",
      textColor: "#0f172a",
      subtextColor: "#475569",
      buttonColor: "#0d6efd"
    };
  }
};

const getBaseConfig = () => {
  const colors = getThemeColors();

  return {
    padding: "2rem",
    background: colors.background,
    color: colors.textColor,
    confirmButtonColor: colors.buttonColor,
    confirmButtonText: "Aceptar",
    didOpen: (modal) => {
      const titleElement = modal.querySelector(".swal2-title");
      const htmlElement = modal.querySelector(".swal2-html-container");
      if (titleElement) titleElement.style.color = colors.textColor;
      if (htmlElement) htmlElement.style.color = colors.subtextColor;

      const popup = modal.querySelector('.swal2-popup');
      if (popup) {
        popup.style.borderRadius = "16px";
        popup.style.border = getDarkMode() ? "none" : "1px solid #e2e8f0";
      }
    }
  };
};

export const notifySuccess = async (title, text) => {
  const Swal = await loadSwal();
  return Swal.fire({
    ...getBaseConfig(),
    icon: "success",
    iconColor: "#10b981",
    title: title,
    text: text
  });
};

export const notifyError = async (title, text) => {
  const Swal = await loadSwal();
  const config = getBaseConfig();
  return Swal.fire({
    ...config,
    icon: "error",
    iconColor: "#ef4444",
    title: title,
    text: text,
    confirmButtonColor: "#ef4444"
  });
};

export const notifyWarning = async (title, text) => {
  const Swal = await loadSwal();
  const config = getBaseConfig();
  return Swal.fire({
    ...config,
    icon: "warning",
    iconColor: "#f59e0b",
    title: title,
    text: text,
    confirmButtonColor: "#f59e0b"
  });
};

export const notifyInfo = async (title, text) => {
  const Swal = await loadSwal();
  const config = getBaseConfig();
  return Swal.fire({
    ...config,
    icon: "info",
    iconColor: "#3b82f6",
    title: title,
    text: text,
    confirmButtonColor: "#3b82f6"
  });
};

export const confirmDelete = async (title, text) => {
  const Swal = await loadSwal();
  const config = getBaseConfig();
  const colors = getThemeColors();
  const isDark = getDarkMode();

  return Swal.fire({
    ...config,
    icon: "warning",
    iconColor: "#f59e0b",
    title: title,
    text: text,
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    confirmButtonText: "Aceptar",
    cancelButtonColor: isDark ? "#475569" : "#e2e8f0",
    cancelButtonText: "Cancelar",
    buttonsStyling: true,
    didOpen: (modal) => {
      const titleElement = modal.querySelector(".swal2-title");
      const htmlElement = modal.querySelector(".swal2-html-container");
      if (titleElement) titleElement.style.color = colors.textColor;
      if (htmlElement) htmlElement.style.color = colors.subtextColor;

      const confirmBtn = modal.querySelector(".swal2-confirm");
      const cancelBtn = modal.querySelector(".swal2-cancel");

      if (confirmBtn) {
        confirmBtn.style.fontWeight = "600";
        confirmBtn.style.padding = "8px 24px";
        confirmBtn.style.borderRadius = "6px";
      }

      if (cancelBtn) {
        cancelBtn.style.fontWeight = "600";
        cancelBtn.style.padding = "8px 24px";
        cancelBtn.style.borderRadius = "6px";
        cancelBtn.style.color = colors.textColor;
        cancelBtn.style.border = `1px solid ${isDark ? "#475569" : "#e2e8f0"}`;
      }
    }
  });
};