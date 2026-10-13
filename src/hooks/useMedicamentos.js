// modules/medicamentos/hooks/useMedicamentos.js

import { useEffect, useState } from 'react'
import {
    getMedicamentos,
    createMedicamento,
    updateMedicamento,
    toggleMedicamento,
    deleteMedicamento
} from '../services/medicamentosService'
import { getSemaforo } from '../utils/getSemaforo'

export const useMedicamentos = () => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)

    const [filtroNombre, setFiltroNombre] = useState('')
    const [filtroSemaforo, setFiltroSemaforo] = useState('todos')
    const [filtroEstado, setFiltroEstado] = useState('todos')

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

    const filtered = data.filter(item => {
        const nombreMedicamento = String(item.nombreMedicamento || '').trim().toLowerCase();
        const filtroNombreNormalized = filtroNombre.trim().toLowerCase();

        if (filtroNombreNormalized && !nombreMedicamento.includes(filtroNombreNormalized)) {
            return false;
        }

        if (filtroEstado !== "todos") {
            if (filtroEstado === "activos" && item.estado !== "activo") {
                return false;
            }

            if (filtroEstado === "inactivos" && item.estado !== "inactivo") {
                return false;
            }
        }

        if (filtroSemaforo !== "todos") {
            if (item.semaforo?.color !== filtroSemaforo) {
                return false;
            }
        }

        return true;
    });

    return {
        data: filtered,
        loading,

        fetchData,

        createMedicamento,
        updateMedicamento,
        toggleMedicamento,
        deleteMedicamento,

        filtroNombre,
        setFiltroNombre,

        filtroSemaforo,
        setFiltroSemaforo,

        filtroEstado,
        setFiltroEstado
    }
}