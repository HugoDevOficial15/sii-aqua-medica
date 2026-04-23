import Swal from "sweetalert2";

export const notifySuccess = (title, text) => {

    Swal.fire({
        icon: "success",
        title: title,
        text: text,
        confirmButtonColor: "#0d6efd"
    });

}

export const notifyError = (title, text) => {

    Swal.fire({
        icon: "error",
        title: title,
        text: text,
        confirmButtonColor: "#dc3545"
    });

}

export const notifyWarnig = (title, text) => {

    Swal.fire({
        icon: "warnig",
        title: title,
        text: text,
        confirmButtonColor: "#f59e0b"
    });

}