import React, {useEffect, useState} from 'react';
import api from "../../services/api.ts";
import {Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip} from "recharts";



const COLORS: { [key: string]: string } = {
    'paid': '#10b981',      // Vert
    'overdue': '#ef4444',   // Rouge
    'partially_paid': '#3b82f6', // Bleu
    'sent': '#f59e0b',      // Orange
    'draft': '#94a3b8',     // Gris
    'cancelled': '#475569'  // Gris foncé
};


const STATUS_LABELS: { [key: string]: string } = {
    'paid': 'Payée',
    'overdue': 'En retard',
    'partially_paid': 'Partiel',
    'sent': 'Envoyée',
    'draft': 'Brouillon',
    'cancelled': 'Annulée'
};

const InvoiceDistributionChart = () => {

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [data, setData] = useState<any[]>([]);
    const [start_date, setStart_date] = useState<string>(thirtyDaysAgo);
    const [end_date, setEnd_date] = useState<string>(today);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handler = setTimeout(() => { fetchData().catch(console.error); }, 800);
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await api.get('/ia/dashboard/invoice-distribution', {
                    params: {  start_date: start_date, end_date: end_date }
                });
                setData(response.data);
            } catch (error) {
                console.error("Erreur API:", error);
            } finally {
                setLoading(false);
            }
        };
        return () => clearTimeout(handler);
    }, [start_date, end_date]);

    // Fonction pour rendre les dates plus jolies sur l'axe X
    const formatXAxis = (tickItem: string) => {
        if (!tickItem) return '';
        const date = new Date(tickItem);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

    };
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Répartition des Factures</h3>

            <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-2 rounded-lg mb-4">
                <div className="flex items-center gap-2">
                    <input type="date" value={start_date} onChange={(e) => setStart_date(e.target.value)} className="bg-white border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none" />
                    <span className="text-gray-400 text-xs">au</span>
                    <input type="date" value={end_date} onChange={(e) => setEnd_date(e.target.value)} className="bg-white border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none" />
                </div>
            </div>

            {/* Conteneur unique pour le graphique ET le chargement */}
            <div className="h-80 w-full relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px] rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                            nameKey="status"
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[entry.status] || '#cbd5e1'}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number, name: string) => [value, STATUS_LABELS[name] || name]}
                        />
                        <Legend
                            formatter={(value) => STATUS_LABELS[value] || value}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

    );
};

export default InvoiceDistributionChart;