// modules/medicamentos/hooks/useMedicamentos.js

import { useEffect, useState } from 'react'
import {
    getMedicamentos,
    createMedicamento,
    updateMedicamento,
    toggleMedicamento
} from '../services/medicamentosService'
import { getSemaforo } from '../utils/getSemaforo'

export const useMedicamentos = () => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)

    const [filtroSemaforo, setFiltroSemaforo] = useState('todos')
    const [filtroEstado, setFiltroEstado] = useState('activos')

    const fetchData = async () => {
        setLoading(true)
        const res = await getMedicamentos()

        const enriched = res.map(item => {
            const fecha = item.fechaCaducidad?.toDate?.() || item.fechaCaducidad

            const semaforo = getSemaforo(fecha);

            return {
                ...item,
                semaforo
            }
        })

        setData(enriched)
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    // 🔥 filtros
    const filtered = data.filter(item => {
        if (filtroEstado === 'activos' && item.estado !== 'activo') return false
        if (filtroEstado === 'inactivos' && item.estado !== 'inactivo') return false

        if (filtroSemaforo !== 'todos') {
            if (item.semaforo.color !== filtroSemaforo) return false
        }

        return true
    })

    return {
        data: filtered,
        loading,

        fetchData,

        createMedicamento,
        updateMedicamento,
        toggleMedicamento,

        filtroSemaforo,
        setFiltroSemaforo,

        filtroEstado,
        setFiltroEstado
    }
}