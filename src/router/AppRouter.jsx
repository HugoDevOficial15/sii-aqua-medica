import { Suspense, lazy, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { verificarYCrearFelicitaciones } from "../utils/felicitaciones";

import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "../components/ProtectedRouter";
import { useAuth } from "../hooks/useAuth";

const Login = lazy(() => import("../modules/auth/Login"));
const Dashboard = lazy(() => import("../pages/admin/Dashboard"));
const AppOperator = lazy(() => import("../pages/operator/AppOperator"));
const ChangePassword = lazy(() => import("../modules/auth/ChangePassword"));
const CreateSurvey = lazy(() => import("../modules/encuestas/CreateSurvey"));
const InventarioPage = lazy(() => import("../modules/inventarios/InventarioPage"));
const News = lazy(() => import("../pages/admin/News"));
const OperadorCitasMedicas = lazy(() => import("../pages/operator/OperadorCitasMedicas"));
const AgendaPage = lazy(() => import("../modules/agenda/AgendaPage"));
const AgendaMesPage = lazy(() => import("../modules/agendabymes/AgendaMesPage"));
const AniversariosPage = lazy(() => import("../modules/aniversarios/AniversarioPage"));
const AniversariosMesesPage = lazy(() => import("../modules/aniversarios/AniversarioMesesPage"));
const ListaServiciosPage = lazy(() => import("../modules/listaservicios/ListaServiciosPage"));
const MedicamentosPage = lazy(() => import("../modules/medicamentos/MedicamentosPaje"));
const AgendaMedicaPage = lazy(() => import("../modules/agendamedica/AgendaMedicaPage"));
const DetalleOrdenMedica = lazy(() => import("../pages/admin/DetalleOrdenMedico"));
const NotasPage = lazy(() => import("../modules/notas/notasPage"));
const RacksPage = lazy(() => import("../modules/almacen/pages/RacksPages"));
const MaterialesPage = lazy(() => import("../modules/almacen/pages/MaterialesPages"));
const AlmacenMaterialesPage = lazy(() => import("../modules/almacen/pages/AlmacenMaterialesPage"));
const RacksDashboard = lazy(() => import("../modules/almacen-peps/pages/RacksDashboard"));
const Users = lazy(() => import("../pages/admin/Users"));
const PuestosPage = lazy(() => import("../modules/puestos/page/PuestosPage"));
const Configuracion = lazy(() => import("../pages/admin/Configuracion"));
const Soporte = lazy(() => import("../pages/admin/Soporte"));
const ReporteProblem = lazy(() => import("../pages/admin/ReporteProblem"));
const Solicitudes = lazy(() => import("../pages/admin/Solicitudes"));
const PrivacyPolicyPage = lazy(() => import("../pages/PrivacyPolicyPage"));
const Ideas = lazy(() => import("../pages/admin/Ideas"));
const Personal = lazy(() => import("../modules/personal/personal"));
const MaintenancePage = lazy(() => import("../components/MaintenancePage"));
const Capacitaciones = lazy(() => import("../pages/admin/Capacitaciones"));
const MisCitasMedicas = lazy(() => import("../pages/operator/MisCitasMedicas"));
const ExpedienteClinico = lazy(() => import("../pages/operator/ExpedienteClinico"));

const RouteFallback = () => (
    <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#e2e8f0",
        fontFamily: "sans-serif"
    }}>
        Cargando...
    </div>
);

export default function AppRouter() {
    
    const { user } = useAuth();
    const felicitacionesCheckedRef = useRef(false);

    useEffect(() => {
        if (!user?.uid) return;

        const triggerPreload = () => {
            window.dispatchEvent(new CustomEvent('sii-aqua-auth-ready'));
        };

        triggerPreload();
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid || felicitacionesCheckedRef.current) return;

        const isLoginRoute = window.location.pathname === "/" || window.location.pathname === "/change-password";
        if (isLoginRoute) return;

        felicitacionesCheckedRef.current = true;

        const timer = setTimeout(async () => {
            try {
                const todayKey = new Date().toISOString().slice(0, 10);
                const cacheKey = `felicitaciones-check-${user.uid}-${todayKey}`;
                if (localStorage.getItem(cacheKey) === "true") return;

                await verificarYCrearFelicitaciones(user);
                localStorage.setItem(cacheKey, "true");
            } catch (error) {
                console.error("Error al verificar felicitaciones al entrar a la app:", error);
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [user?.uid]);

    return (
        <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
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

                        {/* ALIAS: Medical Appointments - Mis Citas */}
                        <Route
                            path="/medical-appointments"
                            element={
                                <ProtectedRoute permiso="citas.ver">
                                    <OperadorCitasMedicas />
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
            </Suspense>
        </BrowserRouter>
    );
}