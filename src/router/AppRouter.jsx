import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../modules/auth/Login";
import Dashboard from "../pages/admin/Dashboard";
import AppOperator from "../pages/operator/AppOperator";
import ChangePassword from "../modules/auth/ChangePassword";
import CreateSurvey from "../modules/encuestas/CreateSurvey";
import InventarioPage from "../modules/inventarios/InventarioPage";
import News from "../pages/admin/News";

import OperadorCitasMedicas from '../pages/operator/OperadorCitasMedicas';
import AgendaPage from "../modules/agenda/AgendaPage";
import AgendaMesPage from "../modules/agendabymes/AgendaMesPage";
import AniversariosPage from "../modules/aniversarios/AniversarioPage";
import AniversariosMesesPage from "../modules/aniversarios/AniversarioMesesPage";
import ListaServiciosPage from "../modules/listaservicios/ListaServiciosPage";
import MedicamentosPage from "../modules/medicamentos/MedicamentosPaje";
import AgendaMedicaPage from "../modules/agendamedica/AgendaMedicaPage";
import DetalleOrdenMedica from "../pages/admin/DetalleOrdenMedico";
import NotasPage from "../modules/notas/notasPage";
import RacksPage from "../modules/almacen/pages/RacksPages";
import MaterialesPage from "../modules/almacen/pages/MaterialesPages";
import AlmacenMaterialesPage from "../modules/almacen/pages/AlmacenMaterialesPage";
import RacksDashboard from "../modules/almacen-peps/pages/RacksDashboard";

import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "../components/ProtectedRouter";

import Users from "../pages/admin/Users";
import PuestosPage from "../modules/puestos/page/PuestosPage";
import Configuracion from "../pages/admin/Configuracion";
import Soporte from "../pages/admin/Soporte";
import ReporteProblem from "../pages/admin/ReporteProblem";
import Solicitudes from "../pages/admin/Solicitudes";
import PrivacyPolicyPage from "../pages/PrivacyPolicyPage";
import Ideas from "../pages/admin/Ideas";
import Personal from "../modules/personal/personal";

import MaintenancePage from "../components/MaintenancePage";
import Capacitaciones from "../pages/admin/Capacitaciones";
import MisCitasMedicas from "../pages/operator/MisCitasMedicas";
import ExpedienteClinico from "../pages/operator/ExpedienteClinico";
import { useAuth } from "../hooks/useAuth";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { initPushNotifications, stopPushNotifications } from "../services/pushNotificationService";
import { useEffect } from "react";

export default function AppRouter() {
    
    const { user } = useAuth();
    usePushNotifications(user);

    //  INICIALIZAR LISTENER DE NOTIFICACIONES EN TIEMPO REAL
    // Detecta nuevas notificaciones en Firestore y las envía vía FCM
    useEffect(() => {
        const userId = user?.uid;
        if (userId) {
            initPushNotifications(userId);

            return () => {
                stopPushNotifications();
            };
        }
    }, [user?.uid]);

    return (
        <BrowserRouter>
            <Routes>

                {/* LOGIN */}
                <Route path="/" element={<Login />} />

                {/* CAMBIO PASSWORD */}
                <Route path="/change-password" element={<ChangePassword />} />

                {/*  BLOQUE PROTEGIDO GENERAL */}
                <Route
                    element={
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    }
                >

                    {/* DASH */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute permiso="dashboard.ver">
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* PERSONAL */}
                    <Route
                        path="/personal"
                        element={
                            <ProtectedRoute permiso="personal.ver">
                                <Personal />
                            </ProtectedRoute>
                        }
                    />

                    {/* USERS */}
                    <Route
                        path="/usuarios"
                        element={
                            <ProtectedRoute permiso="usuarios.ver">
                                <Users />
                            </ProtectedRoute>
                        }
                    />

                    {/* PUESTOS */}
                    <Route
                        path="/puestos"
                        element={
                            <ProtectedRoute permiso="puestos.ver">
                                <PuestosPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* ENCUESTAS */}
                    <Route
                        path="/encuestas"
                        element={
                            <ProtectedRoute permiso="encuestas.ver">
                                <CreateSurvey />
                            </ProtectedRoute>
                        }
                    />

                    {/* CAPACITACIONES */}
                    <Route
                        path="/capacitaciones"
                        element={
                            <ProtectedRoute permiso="capacitaciones.ver">
                                <Capacitaciones />
                            </ProtectedRoute>
                        }
                        />

                    {/* SOLICITUDES DE CAMBIOS */}
                    <Route
                        path="/solicitudes"
                        element={
                            <ProtectedRoute permiso="solicitudes.ver">
                                <Solicitudes />
                            </ProtectedRoute>
                        }
                    />

                    {/* NOTICIAS */}
                    <Route
                        path="/noticias"
                        element={
                            <ProtectedRoute permiso="noticias.ver">
                                <News />
                            </ProtectedRoute>
                        }
                    />

                    {/* INVENTARIO */}
                    <Route
                        path="/inventario"
                        element={
                            <ProtectedRoute permiso="inventario.ver">
                                <InventarioPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* AGENDA */}
                    <Route
                        path="/agenda"
                        element={
                            <ProtectedRoute permiso="servicios.agendar">
                                <AgendaPage />
                            </ProtectedRoute>
                        }
                    />
                    
                    {/*SERVICIOS */}
                    <Route
                        path="/agenda/:mes"
                        element={
                            <ProtectedRoute permiso="servicios.agendar">
                                <AgendaMesPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* ANIVERSARIOS */}
                    <Route
                        path="/aniversarios"
                        element={
                            <ProtectedRoute permiso="aniversarios.ver">
                                <AniversariosMesesPage />
                            </ProtectedRoute>
                        }
                    />
                    
                    {/*ANIVERSARIOS*/}
                    <Route
                        path="/aniversarios/:mes"
                        element={
                            <ProtectedRoute permiso="aniversarios.ver">
                                <AniversariosPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* LISTA SERVICIOS */}
                    <Route
                        path="/servicioshoy"
                        element={
                            <ProtectedRoute permiso="servicios.ver_global">
                                <ListaServiciosPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* MEDICAMENTOS */}
                    <Route
                        path="/medicamento"
                        element={
                            <ProtectedRoute permiso="medicamentos.ver">
                                <MedicamentosPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* CITA MEdica */}
                    <Route
                        path="/citas-medicas"
                        element={
                            <ProtectedRoute permiso="citas.ver">
                                <AgendaMedicaPage />
                            </ProtectedRoute>
                        }
                    />

                    {/*ORDEN MÉDICA*/}
                    <Route
                        path="/detalle-orden-medico"
                        element={
                            <ProtectedRoute permiso="ordenes.ver">
                                <DetalleOrdenMedica />
                            </ProtectedRoute>
                        }
                    />

                    {/* NOTAS */}
                    <Route
                        path="/notas"
                        element={
                            <ProtectedRoute permiso="notas.ver">
                                <NotasPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/almacen/racks"
                        element={
                            <ProtectedRoute permiso="peps.ver">
                                <RacksPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/almacen/materiales"
                        element={
                            <ProtectedRoute permiso="peps.ver">
                                <MaterialesPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/almacen/materiales-stock"
                        element={
                            <ProtectedRoute permiso="peps.ver">
                                <AlmacenMaterialesPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/almacen/peps"
                        element={
                            <ProtectedRoute permiso="peps.ver">
                                <RacksDashboard />
                            </ProtectedRoute>
                        }
                    />


                    <Route
                        path="/herramientas"
                        element={
                            <ProtectedRoute permiso="herramientas.ver">
                                <MaintenancePage
                                    title="Mantenimiento"
                                    subtitle="Herramientas no disponibles"
                                    message="El módulo de herramientas aún se encuentra en desarrollo."
                                />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/configuracion"
                        element={
                            <ProtectedRoute permiso="config.ver">
                                <Configuracion />
                            </ProtectedRoute>
                        }
                    />

                    {/* SOPORTE */}
                    <Route
                        path="/soporte"
                        element={
                            <ProtectedRoute>
                                <Soporte />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/ideas"
                        element={
                            <ProtectedRoute>
                                <Ideas />
                            </ProtectedRoute>
                        }
                    />

                    {/* REPORTE DE PROBLEMAS */}
                    <Route
                        path="/reporte-problemas"
                        element={
                            <ProtectedRoute>
                                <ReporteProblem />
                            </ProtectedRoute>
                        }
                    />

                </Route>


                {/* OPERADOR */}
                <Route
                    path="/app"
                    element={
                        <ProtectedRoute role="operador">
                            <AppOperator />
                        </ProtectedRoute>
                    }
                />

                {/*MIS CITAS MÉDICAS (USUARIO)*/}
                <Route
                    path="/mis-citas"
                    element={
                        <ProtectedRoute role="operador">
                            <MisCitasMedicas />
                        </ProtectedRoute>
                    }
                />   

                {/*EXPEDIENTE MÉDICO PARA EMPLEADOS */} 
                <Route
                    path="/expediente-clinico"
                    element={
                        <ProtectedRoute role="operador">
                            <ExpedienteClinico />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/privacy"
                    element={<PrivacyPolicyPage />}
                />

            </Routes>
        </BrowserRouter>
    );
}