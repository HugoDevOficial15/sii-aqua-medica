==================================

            ============
            = 07/10/26 =
            ============

**-Nuevas-Functions:-**

* loadNotifications
* dismissHeaderNotification
* getOperatorNotifications
* deleteNotification
* clearAllNotifications
* crearMateriaPrima
* obtenerMateriaPrima
* actualizarMateriaPrima
* obtenerItemsPorTipo
* crearAcondicionamiento
* obtenerAcondicionamiento
* actualizarAcondicionamiento
* crearProducto
* obtenerProducto
* actualizarProducto
* crearRack
* actualizarRack
* eliminarRack
* suscribirRacks
* suscribirMovimientos
* obtenerRacks
* refreshRackStockCaches
* crearStock
* actualizarCantidadStock
* eliminarStock
* actualizarColorStockPorItem
* obtenerStockPEPS
* descontarStockPEPS
* trasladarStockPEPS
* suscribirStockPorRack
* suscribirStock
* obtenerStockPorRack


Aplicacion 
* createIdea
* cargarIdeas
* getIdeasByUser
* cambiarEstadoIdea
* deleteIdea


**-Functions-refactorizadas-**

* saveOperatorSurveyResponse
* saveOperatorTrainingResponse
* approveRequest
* rejectRequest
* requestProfileChange

==================================

            ============
            = 06/10/26 =
            ============

**Practicantes - Arregladas:**
* getPracticantesPage
* searchPracticantes 


**Verificar-Logins**
* verificarUsuariosLogueados
* verificarUsuariosLogueadosHttp
* verificacionLogs

==================================

            ============
            = 05/10/26 =
            ============

Nuevas Comedor:

* useComedorOrdenes.js
* OperadorComedor.jsx 

Notificaciones:
  - saveMenuNotification

Nuevas: 
 * getSalas
 * agregarSala
 * eliminarSala
 * editarSala
 * verificarUsuariosLogueados
 * verificarUsuariosLogueadosHttp
 * verificacionLogs

ReFactorizadas:

* getAgendaSalasPorMes
* createSupportTicket
* cargarProblemas
* cambiarEstado
* handleEliminarProblema
* crearServicio

==================================

            ============
            = 30/09/26 =
            ============

Nuevas:

* getAgendaSalas
* getAgendaSalasPorMes
* crearAgendaSala
* eliminarAgendaSala
* editarAgendaSala


Nuevas (Operador - Vistas Faltantes):

Notificaciones:
* getOperatorNotifications - Obtener notificaciones del operador
* deleteNotification - Eliminar una notificación
* clearAllNotifications - Limpiar todas las notificaciones

Preferencias:
* getOperatorPreferences - Obtener preferencias del usuario
* updateOperatorPreferences - Actualizar tema, fuente, idioma, etc.
* updateProfilePhoto - Actualizar foto de perfil

Certificados:
* getOperatorCertificates - Obtener certificados y cursos aprobados
* getCertificatesByYear - Obtener certificados de un año específico

Reconocimientos:
* getOperatorRecognitions - Obtener reconocimientos del operador
* getRecognitionsByArea - Obtener reconocimientos agrupados por área

Incidencias:
* getOperatorIncidences - Obtener incidencias del operador
* getIncidenceDetails - Obtener detalles de una incidencia específica

Expediente Clínico:
* getOperatorExpediente - Obtener expediente clínico y órdenes médicas
* getOrdenMedica - Obtener detalles de una orden médica
* getOrdenesMedicasByEstado - Obtener órdenes por estado

Comedor (Vistas):
* getComedorVisualizacionSemanal - Obtener visualización semanal de comidas
* getComedorCostos - Calcular costos de comedor para un período

Notificaciones (Menús Publicados):
* subscribirANotificacionesMenus - Escuchar notificaciones en tiempo real
* marcarNotificacionComoLeida - Marcar notificación como leída
* obtenerNotificacionesNoLeidas - Filtrar notificaciones sin leer
* NotificacionesMenus (Componente) - Panel visual de notificaciones

Operador Info (Pantallas Estáticas):
* getAppInfo - Obtener información general de la aplicación
* getLegalInfo - Obtener políticas de privacidad y términos
* getSupportInfo - Obtener información de soporte
* getMoreMenuItems - Obtener items del menú adicional

Reportar Problema:
* reportProblem - Crear nuevo reporte de problema
* getMyProblems - Obtener problemas reportados por el usuario
* getProblemDetails - Obtener detalles de un problema específico

Operador Home:
* getOperatorHomeDashboard - Obtener dashboard de inicio con notificaciones, noticias, encuestas
* getOperatorStats - Obtener estadísticas rápidas del operador

ReFactorizadas:


==================================

            ============
            = 29/09/26 =
            ============

Nuevas: 


ReFactorizadas:

* getUsers
* getUsersPage
* searchUsers
* getPersonalUsers
* getPersonalPageData
* getPersonalIncidencias
* getPersonalReconocimientos
* getPersonalIncapacidades
* getPersonalHistorialesMedicos
* getPersonalCapacitaciones
* getPersonalPdfReportData


* saveNotification
* createNotification
* getAdminsByRoles
* sendAdminNotificationToRoles
* createNota
* obtenerNotasPorUsuario
* updateNota
* deleteNota

Nuevas (Practicantes):

* getPracticantesPage
* searchPracticantes
* updatePracticante

RefActorizadas (Practicantes):

* createPracticante

==================================

            ============
            = 28/09/26 =
            ============

Colleciones completas:

* agendaMedica
* citasMedicas
* medicamentos
* news
* ordenesMedicas

Nuevas: 

* getAgendasMedicas
* crearAgenda
* generateAgendaSlots
* toggleAgendaEstado
* updateAgenda
* deleteAgenda
* updateAgendaWithBatch
* notifyAdminsForAppointmentEvent
* getCitasMedicas
* atenderCita
* cancelarCitaPorAdmin
* getCitasPorAgenda
* getUserAppointments
* cancelAppointmentByUser
* cancelAppointmentsByAgenda
* getAvailableSchedules
* bookAppointment
* getMedicamentos
* createMedicamento
* updateMedicamento
* toggleMedicamento
* deleteMedicamento
* getNoticias
* getNoticiasOperator
* createNoticia
* updateNoticia
* deleteNoticia
* getMisOrdenesMedicas
* createOrdenMedica
* deleteOrdenMedica
* getOrdenesMedicas
* buscarOrdenesActivasPorPaciente
* getUsuarioPorNomina
* getUsuarioByDocId
* crearOrdenAtencionRapida
* guardarRevisionOrdenMedica
* eliminarOrdenMedicaAdmin


Colecciones completas de refactorizaciones:

* usuarios
* capacitaciones
* surveys

Refactorizadas:

* getOperatorTrainings
* saveOperatorTrainingResponse
* getOperatorSurveys
* getMySurveyResponses
* saveOperatorSurveyResponse
* getSurveyAttempts
* hasAnsweredSurvey
* getSurveyHistory
* getUsers
* getUsersPage
* searchUsers

Nuevas sii:

* getPracticantesPage
* searchPracticantes
* createPracticante
* updatePracticante

API Externa (aquamedica2023):

* obtenerCostosComedor
* calcularCostos
* CancelarComida
* getUserRequests
* crearSugerencia
* obtenerSugerencias
* obtenerMenuEmpleado
==================================

            ============
            = 25/09/26 =
            ============

Nuevas: 

* getOperadoresConductuales
* getEvaluacionesConductuales
* guardarEvaluacionConductual

ReFactorizadas:

* createPersonalReconocimiento
* createPersonalIncidencia
* createPersonalIncapacidad
* getPersonalUsers
* getPersonalPageData
* getPersonalRecordsByUsers
* getUsers
* getUsersPage
* searchUsers
* resetFailedLoginAttempts
* registerFailedLoginAttempt



