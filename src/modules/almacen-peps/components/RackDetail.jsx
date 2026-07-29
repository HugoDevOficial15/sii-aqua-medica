import { FaCarAlt, FaCloudDownloadAlt, FaFilePdf } from "react-icons/fa";
import RackInventory from "./RackInventory";
import RackMovimientos from "./RackMovimientos";
import { useState } from "react";
import MovimientoModal from "./MovimientoModal";
import { vaciarRack } from "../../../services/movimientosService";
import { actualizarRack } from "../../../services/rackService";
import { notifySuccess, notifyError } from "../../../utils/notify";

import RackTransferModal from "./RackTransferModal";

import RackPdfModal from "./RackPdfModal";

import {
    bloquearRack,
    liberarRack
} from "../../../services/rackService";


import {
    FaArrowRightArrowLeft
} from "react-icons/fa6";

//Salida.

import RackSalidaModal from "./RackSalidaModal";


// hooks
import { useAuth } from "../../../hooks/useAuth";

export default function RackDetail({ rack, refresh }) {

    const { user } = useAuth();

    const [show, setShow] = useState(false);

    const [showSalida, setShowSalida] =
        useState(false);

    const [showPdf, setShowPdf] =
        useState(false);

    const [showTransfer, setShowTransfer] =
        useState(false);

    const rackBloqueado =
        rack?.estatus === "mantenimiento" ||
        rack?.estatus === "baja" ||
        rack?.estatus === "inactivo";

    const rackSinStock =
        (rack?.stock || []).length === 0;

    const rackLleno =
        (rack?.stock || []).length >= 10;

    if (!rack) {
        return (
            <div className="p-3 text-muted text-center">
                Selecciona un rack
            </div>
        );
    }


    const handleVaciar = async () => {


        await vaciarRack(rack.id, {
            id: user.id,
            nombre: user.nombre
        });

        await actualizarRack(rack.id, {
            estatus: "libre"
        });

        await refresh();

        notifySuccess("Rack vaciado", "Correctamente");
    };

    const abrirMovimiento = async () => {

        try {

            const result = await bloquearRack(

                rack.id,

                user

            );

            if (!result.ok) {

                notifyError(

                    "Rack ocupado",

                    result.message

                );

                return;

            }

            setShow(true);

        } catch (e) {

            console.error(e);

            notifyError(

                "Error",

                "No fue posible abrir el rack."

            );

        }

    };

    return (
        <div className="p-3 text-center">

            <h6>Número de Rack: {rack.numeroRack}</h6>
            <p><b>Planta:</b> {rack.planta}</p>

            <hr />

            <RackMovimientos rack={rack} />

            <hr />

            {rackBloqueado && (
                <div className="alert alert-warning text-start">

                    <strong>Rack bloqueado</strong>

                    <br />

                    Este rack se encuentra en
                    <strong> {rack.estatus}</strong>.

                    <br />

                    No es posible realizar movimientos,
                    salidas o traslados hasta que vuelva
                    al estado <strong>Activo</strong>.

                </div>
            )}

            <h6>Acciones</h6>

            <div className="d-flex gap-2 justify-content-center">

                <button
                    className="btn btn-warning btn-sm"

                    disabled={rackBloqueado || rackSinStock}

                    onClick={async () => {

                        const result = await bloquearRack(

                            rack.id,

                            user

                        );

                        if (!result.ok) {

                            notifyError(

                                "Rack ocupado",

                                result.message

                            );

                            return;

                        }

                        setShowSalida(true);

                    }}
                >
                    <FaCloudDownloadAlt className="me-2" />
                    Salida
                </button>

                <button
                    className="btn btn-info btn-sm"

                    disabled={rackBloqueado || rackSinStock}

                    onClick={async () => {

                        const result = await bloquearRack(

                            rack.id,

                            user

                        );

                        if (!result.ok) {

                            notifyError(

                                "Rack ocupado",

                                result.message

                            );

                            return;

                        }

                        setShowTransfer(true);

                    }}
                >
                    <FaArrowRightArrowLeft
                        className="me-2"
                    />

                    Traslado
                </button>

                <button
                    className="btn btn-primary btn-sm"

                    disabled={

                        rack.estatus === "ocupado" ||

                        rackBloqueado ||

                        rackLleno

                    }

                    onClick={abrirMovimiento}
                >
                    <FaCarAlt className="me-2" />
                    Movimiento
                </button>

                <button
                    className="btn btn-danger btn-sm"

                    onClick={() =>
                        setShowPdf(true)
                    }
                >
                    <FaFilePdf className="me-2" />

                    Historial
                </button>

            </div>
            <hr />

            <RackInventory rack={rack} />


            {/* Modal de movimientos */}
            {show && (
                <MovimientoModal
                    rack={rack}

                    onClose={async () => {

                        try {

                            await liberarRack(rack.id);

                        } finally {

                            setShow(false);

                        }

                    }}

                    refresh={refresh}
                />
            )}

            {/* Modal de salida */}
            {
                showSalida && (
                    <RackSalidaModal

                        rack={rack}

                        onClose={async () => {

                            await liberarRack(

                                rack.id

                            );

                            setShowSalida(false);

                        }}

                        refresh={refresh}
                    />
                )
            }

            {/* Rack  */}
            {
                showPdf && (

                    <RackPdfModal

                        rack={rack}

                        onClose={() =>
                            setShowPdf(false)
                        }
                    />
                )
            }


            {
                showTransfer && (

                    <RackTransferModal

                        rack={rack}

                        onClose={async () => {

                            await liberarRack(

                                rack.id

                            );

                            setShowTransfer(false);

                        }}

                        refresh={refresh}
                    />
                )
            }

        </div>
    );
}