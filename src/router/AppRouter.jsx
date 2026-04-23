import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../modules/auth/Login";
import Dashboard from "../pages/admin/Dashboard";
import AppOperator from "../pages/operator/AppOperator";
import ChangePassword from "../modules/auth/ChangePassword";
import CreateSurvey from "../modules/encuestas/CreateSurvey";
import InventarioPage from "../modules/inventarios/InventarioPage";
import AgendaPage from "../modules/agenda/AgendaPage";
import AgendaMesPage from "../modules/agendabymes/AgendaMesPage";
import AniversariosPage from "../modules/aniversarios/AniversarioPage";
import AniversariosMesesPage from "../modules/aniversarios/AniversarioMesesPage";
import ListaServiciosPage from "../modules/listaservicios/ListaServiciosPage";
import MedicamentosPage from "../modules/medicamentos/MedicamentosPaje";
import AgendaMedicaPage from "../modules/agendamedica/AgendaMedicaPage";
import NotasPage from "../modules/notas/notasPage";
import RacksPage from "../modules/almacen/pages/RacksPages";
import MaterialesPage from "../modules/almacen/pages/MaterialesPages";
import RacksDashboard from "../modules/almacen-peps/pages/RacksDashboard";

import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "../components/ProtectedRouter";

import Users from "../pages/admin/Users";
import PuestosPage from "../modules/puestos/page/PuestosPage";

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>

                {/* LOGIN */}
                <Route path="/" element={<Login />} />

                {/* CAMBIO PASSWORD */}
                <Route path="/change-password" element={<ChangePassword />} />

                {/* 🔥 BLOQUE PROTEGIDO GENERAL */}
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
                            <ProtectedRoute permiso="citas-medicas.ver">
                                <AgendaMedicaPage />
                            </ProtectedRoute>
                        }
                    />


                    {/* CITA MEdica */}
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
                        path="/almacen/peps"
                        element={
                            <ProtectedRoute permiso="peps.ver">
                                <RacksDashboard />
                            </ProtectedRoute>
                        }
                    />

                </Route>


                {/* OPERADOR (NO SE TOCA) */}
                <Route
                    path="/app"
                    element={
                        <ProtectedRoute role="operador">
                            <AppOperator />
                        </ProtectedRoute>
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}