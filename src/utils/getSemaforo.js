// modules/medicamentos/utils/getSemaforo.js

const parseFechaCaducidad = (value) => {
    if (!value) return null

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value
    }

    if (typeof value?.toDate === 'function') {
        const fecha = value.toDate()
        return Number.isNaN(fecha.getTime()) ? null : fecha
    }

    if (typeof value === 'string') {
        const texto = value.trim()
        if (!texto) return null

        if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
            const [year, month, day] = texto.split('-').map(Number)
            const fecha = new Date(year, month - 1, day)
            return Number.isNaN(fecha.getTime()) ? null : fecha
        }

        if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(texto)) {
            const [day, month, year] = texto.replace(/\-/g, '/').split('/').map(Number)
            const fecha = new Date(year, month - 1, day)
            return Number.isNaN(fecha.getTime()) ? null : fecha
        }

        const fecha = new Date(`${texto}T00:00:00`)
        return Number.isNaN(fecha.getTime()) ? null : fecha
    }

    if (typeof value === 'number') {
        const fecha = new Date(value)
        return Number.isNaN(fecha.getTime()) ? null : fecha
    }

    if (value && typeof value === 'object' && typeof value._seconds === 'number') {
        const fecha = new Date(value._seconds * 1000 + (value._nanoseconds ?? 0) / 1_000_000)
        return Number.isNaN(fecha.getTime()) ? null : fecha
    }

    return null
}

export const getSemaforo = (fechaCaducidad) => {
    const hoy = new Date()
    const cad = parseFechaCaducidad(fechaCaducidad)

    if (!cad || Number.isNaN(cad.getTime())) {
        return { color: 'rojo', label: 'Fecha inválida', dias: null }
    }

    const diff = cad.getTime() - hoy.getTime()
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
    const meses = dias / 30

    if (meses < 0) return { color: 'rojo', label: 'Vencido', dias }
    if (meses < 6) return { color: 'rojo', label: '< 6 meses', dias }
    if (meses <= 12) return { color: 'amarillo', label: '6-12 meses', dias }

    return { color: 'verde', label: '> 12 meses', dias }
}