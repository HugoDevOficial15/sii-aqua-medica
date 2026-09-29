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
* Se crearon funciones de notas y notificaciones 


Nuevas (Practicantes):

* getPracticantesPage
* searchPracticantes
* updatePracticante

RefActorizadas (Practicantes):

* createPracticante

==================================