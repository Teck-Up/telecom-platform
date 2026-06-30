import React, { useEffect, useState } from 'react';
import api from "../../services/api.ts";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const RevenueEvolutionChart = () => {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [data, setData] = useState<any[]>([]);
    const [startDate, setStartDate] = useState<string>(thirtyDaysAgo);
    const [endDate, setEndDate] = useState<string>(today);
    const [granularity, setGranularity] = useState<string>("day");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handler = setTimeout(() => { fetchData().catch(console.error); }, 800);
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await api.get('/ia/dashboard/revenue-history', {
                    params: { granularity, start_date: startDate, end_date: endDate }
                });
                setData(response.data);
            } catch (error) {
                console.error("Erreur API:", error);
            } finally {
                setLoading(false);
            }
        };
        return () => clearTimeout(handler);
    }, [granularity, startDate, endDate]);

    // Fonction pour rendre les dates plus jolies sur l'axe X
    const formatXAxis = (tickItem: string) => {
        if (!tickItem) return '';
        const date = new Date(tickItem);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Analyse de Performance</h3>
                    <p className="text-sm text-gray-500">Répartition des encaissements et impayés</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-2 rounded-lg">
                    <select
                        value={granularity}
                        onChange={(e) => setGranularity(e.target.value)}
                        className="bg-white border border-gray-200 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="day">Par Jour</option>

                        <option value="month">Par Mois</option>
                        <option value="year">Par Ans</option>
                    </select>
                    <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none" />
                        <span className="text-gray-400 text-xs">au</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-white border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none" />
                    </div>
                </div>
            </div>

            <div className="h-80 w-full relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="period"
                                tickFormatter={formatXAxis}
                                tick={{fontSize: 12, fill: '#94a3b8'}}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{fontSize: 12, fill: '#94a3b8'}}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => `${value}€`}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [`${value.toFixed(2)} €`]}
                            />
                            <Legend verticalAlign="top" height={36}/>

                            {/* Barres empilées */}
                            <Bar dataKey="paid" name="Payé" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={20} />
                            <Bar dataKey="unpaid" name="Impayé" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />

                            {/* Ligne de tendance du CA total */}
                            <Line type="monotone" dataKey="revenue" name="CA Total" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl">
                        <p className="text-gray-400 text-sm">Aucune donnée trouvée.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RevenueEvolutionChart;
