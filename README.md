# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.



🧩 📊 DASHBOARD
dashboard.ver
dashboard.kpis
dashboard.graficas
dashboard.encuestas
🧩 👥 USUARIOS
usuarios.ver
usuarios.crear
usuarios.editar
usuarios.desactivar
usuarios.reset_password
🧩 🧑‍💼 PUESTOS
puestos.ver
puestos.crear
puestos.editar
puestos.eliminar
🧩 📋 ENCUESTAS
encuestas.ver
encuestas.crear
encuestas.editar
encuestas.eliminar
encuestas.evaluar
🧩 📦 INVENTARIO (EQUIPOS)
inventario.ver
inventario.crear
inventario.editar
inventario.eliminar
inventario.asignar_area
🧩 🛠 SERVICIOS (CORE DE TU SISTEMA)
🔹 Agenda (por área)
servicios.agendar
servicios.ver_area
servicios.validar_horario
🔹 Lista global (SISTEMAS)
servicios.ver_global
servicios.cambiar_estado
servicios.agregar_observacion
🔹 Control avanzado
servicios.cancelar
servicios.reprogramar
🧩 📜 LOGS DE EQUIPOS
logs.ver
logs.crear
logs.exportar
🧩 🎂 ANIVERSARIOS
aniversarios.ver
aniversarios.filtrar_mes
🧩 💊 INVENTARIO MEDICAMENTOS
medicamentos.ver
medicamentos.crear
medicamentos.editar
medicamentos.eliminar
medicamentos.stock
🧩 🏥 SERVICIO MÉDICO (CITAS)
citas.ver
citas.crear
citas.editar
citas.cancelar
🧩 🧰 HERRAMIENTAS
herramientas.ver
herramientas.crear
herramientas.editar
herramientas.eliminar
🧩 📝 NOTAS
notas.ver
notas.crear
notas.editar
notas.eliminar
🧩 ⚙️ CONFIGURACIÓN
configuracion.ver
configuracion.editar
configuracion.roles
🧩 🧪 PEPS
peps.ver
peps.crear
peps.editar
peps.eliminar

#################################################################
#                                                               #
#                        Diseño general                         #
#                                                               #
#################################################################

#####################
# ARCHIVO DE DISEÑO #
#####################

El archivo donde se encontraran los estilos usados para este diseño se encuentra en /src/styles/operator/operator-theme.css

#################
# INSTRUCCIÓNES #
#################
# Para usar los temas del archivo se deberan usar de la siguiente forma #

var(--operator-background)

# Paginas #

* Toda pagina principal debera contar en su parte izquierda superior su titulo de pagina y en seguida en la parte de abajo el nombre de la empresa "AQUE Médica".

* El color de fondo de la pagina debera ser unicamente "--operator-backhground", haciendolo dinamico con el cambio de tema.

* Todos los inputs y selects que apaezcan en las paginas principales deberan llevar el siguiente diseño: 

        height: "50px",
        borderRadius: "12px",
        border: "1px solid var(--operator-border)",
        padding: "0 14px",
        color: "var(--operator-text)",
        fontSize: "14px",
        outline: "none"

* Todos los botones que esten en la pagina principal deberan seguir las siguientes reglas de diseño: 

        height: 40px;
        padding: 0 20px;
        border-radius: 10px;
        border: none;
        background: var(--operator-primary);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0px 20px var(--operator-primary-light);




# Contenedores #

* Toda caja que contenga labels, inputs etc, se debera de usar con el color "--operator-card", para distinguirlo del fondo.

* Toda caja de contendio tendra que tener un "border-radius: 30px".

* Toda caja de contendido tendra un "box-shadow: 0 8px 25px  var(--operator-shadow)"


# Ventanas emergentes (Modales) #

* El color de fondo sera ""--operator-card"

* Toda ventana modal seguira las siguintes reglas:

        overflow: "hidden",
        background: "var(--operator-card)",
        backdropFilter: "blur(12px)",
        borderRadius: "20px",
        border: "1px solid var(--operator-border)",
        boxShadow: "0 24px 48px var(--operator-shadow)",

* El head de la ventana siempre seguira esats reglas:

        display: "flex",
        border: "none",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "24px 30px",
        background: "var(--operator-card)"

* El titulo del header sera siempre con la siguintes reglas:

        margin: 0,
        fontSize: "1.5rem",
        fontWeight: "800",
        color: "var(--operator-text"),

* El body seguira las siguientes reglas:
        border: "none"
        padding: "30px",
        background: "var(--operator-card)",

* Los labels de las ventanas emergentes seguiran las siguientes reglas:

        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: "var(--operator-text)"

* Los inputs y selects de las ventanas emergentes tendran el siguiente formato:

        height: "50px",
        borderRadius: "12px",
        border: "1px solid var(--operator-border)",
        padding: "0 14px",
        background: "var(--operator-border)",
        color: "var(--operator-text)",
        fontSize: "14px",
        outline: "none"

* El footer de las ventanas emergentes seguiran las siguientes reglas:

        border: "none",
        gap: "12px",
        display: "flex",
        justifyContent: "flex-end"

* En las ventanas emergentes que ocupen un boton de guardar deberan de contar con lo siguiente para dicho boton: Un heigth: 

        height: "50px",
        padding: "0 24px",
        borderRadius: "14px",
        border: "none",
        background: "var(--operator-primary)",
        color: "#fff",
        fontWeight: "700",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0px 20px var(--operator-primary-light)",

* En los botones de cerrado "closeButton" se usara el siguiente diseño: 

        width: "36px",
        height: "36px",
        border: "none", 
        borderRadius: "10px",
        background: "var(--operator-card)", 
        color: "var(--operator-text)", 
        fontSize: "30px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"

* Todos los botones de cerrar tienen que tener el siguiente hover:

        background: var(--operator-border);
        color: var(--operator-primary);


* En caso de que la ventana contenga un boton de cancelar usar las siguientes reglas:




# TABLAS #

* Todos los heads th deberan seguir las siguientes reglas:

        border-bottom: 3px solid var(--operator-text);
        font-size: 20px;
        font-weight: 900;
        padding: 5px 5px;
        vertical-align: middle;
        border-top: none !important;
        white-space: wrap;

        word-break: break-word;
        overflow-wrap: anywhere;
        max-width: 230px;
        min-width: 100px;

* Todos los tbody td deberan seguir las siguientes reglas:
        border-bottom: 3px solid var(--operator-border);
        height: 50px;
        font-size 14px;
        padding: 5px 5px;
        vertical-align: middle;
        border-top: none !important;
        white-space: wrap;

        word-break: break-word;
        overflow-wrap: anywhere;
        max-width: 230px;
        min-width: 100px;


* Todas las tablas llevaran hover:
        
        transform: scale(1.02);
        transition: transform 0.2s;

* En caso de que se muestren estatus o mensajes en la tabla se usara el siguiente formato:

        background: "EL COLOR QUE NECESITES";
        color: "EL COLOR QUE NECESITES";
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 0.8rem;

* En caso de usar botones dentro de la tabla se usara el siguiente formato:

HTML:
        className="btn btn-sm "TIPO DE BOTON QUE USES" custom-btn"
        onClick={handleCreate}

        <Fa"TIPO DE ICONO QUE USES" className="TU CLASE" />
        "TEXTO DEL BOTON"


y se usara el icono que mas convenga usar en dicho boton.

CSS:
        border-radius: 10px;


