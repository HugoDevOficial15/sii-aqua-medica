// modules/medicamentos/utils/getSemaforo.js

export const getSemaforo = (fechaCaducidad) => {
    const hoy = new Date()
    const cad = new Date(fechaCaducidad)

    const diff = cad - hoy
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
    const meses = dias / 30

    if (meses < 0) return { color: 'rojo', label: 'Vencido', dias }
    if (meses < 6) return { color: 'rojo', label: '< 6 meses', dias }
    if (meses <= 12) return { color: 'amarillo', label: '6-12 meses', dias }

    return { color: 'verde', label: '> 12 meses', dias }
}