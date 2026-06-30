import React, { useEffect, useState } from 'react';
import api from "../../services/api.ts";
import {
    ComposedChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, ReferenceLine, Line
} from 'recharts';

const RevenuePredictionChart = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Paramètres modifiables par l'utilisateur
    const [periods, setPeriods] = useState(30);
    const [granularity, setGranularity] = useState("day");

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const now = new Date();
                let startDate = new Date();

                // On ajuste pour remonter assez loin dans l'historique
                // Par exemple, on peut remonter de 10 ans pour être sûr de voir 2016
                if (granularity === 'day') startDate.setDate(now.getDate() - (periods * 2)); // On regarde 2x plus loin
                else if (granularity === 'month') startDate.setMonth(now.getMonth() - (periods * 3));
                else if (granularity === 'year') startDate.setFullYear(2016); // On force le début à 2016 pour le mode année

                const startDateStr = startDate.toISOString().split('T')[0];
                const endDateStr = now.toISOString().split('T')[0];

                const [historyRes, predictRes] = await Promise.all([
                    api.get('/ia/dashboard/revenue-history', {
                        params: { granularity, start_date: startDateStr, end_date: endDateStr }
                    }),
                    api.post('/ia/predict', { periods, granularity })
                ]);

                // FUSION ET FIX 1970
                const historyData = (historyRes.data.data || historyRes.data).map((item: any) => {
                    // FIX : Si c'est juste une année "2016", on transforme en "2016-01-01"
                    const periodStr = item.period.toString();
                    const cleanDate = periodStr.length === 4 ? `${periodStr}-01-01` : periodStr;

                    return {
                        ds: cleanDate,
                        realRevenue: item.revenue,
                        isPrediction: false
                    };
                });

                const predictionData = (predictRes.data.data || predictRes.data).map((item: any) => ({
                    ds: item.ds,
                    yhat: item.yhat,
                    yhat_lower: item.yhat_lower,
                    yhat_upper: item.yhat_upper,
                    isPrediction: true
                }));

                setData([...historyData, ...predictionData]);
            } catch (error) {
                console.error("Erreur:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [periods, granularity]);

    const today = new Date().toISOString().split('T')[0];
    console.log("data ==> ",data)
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            {/* Header avec contrôles */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Prévisions & Historique</h3>
                    <p className="text-sm text-gray-500">Comparaison CA réel vs Estimations IA</p>
                </div>

                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg">
                    <input
                        type="number"
                        value={periods}
                        onChange={(e) => setPeriods(Number(e.target.value))}
                        className="w-16 border rounded px-2 py-1 text-sm outline-none"
                    />
                    <select
                        value={granularity}
                        onChange={(e) => setGranularity(e.target.value)}
                        className="bg-white border rounded px-2 py-1 text-sm outline-none"
                    >
                        <option value="day">Jours</option>
                        <option value="month">Mois</option>
                        <option value="year">Années</option>
                    </select>
                </div>
            </div>

            <div className="h-96 w-full relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                            dataKey="ds"
                            tickFormatter={(str) => {
                                const d = new Date(str);
                                return granularity === 'year' ? d.getFullYear().toString() :
                                    d.toLocaleDateString('fr-FR', { month: 'short', day: granularity === 'day' ? '2-digit' : undefined });
                            }}
                            tick={{fontSize: 12, fill: '#4f69aa'}}
                        />
                        <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} />
                        <Tooltip
                            labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString('fr-FR')}`}
                            formatter={(value: number) => [`${value.toFixed(2)} €`]}
                        />
                        <Legend verticalAlign="top" height={36}/>

                        <ReferenceLine x={today} stroke="red" strokeDasharray="3 3" label={{ position: 'top', value: 'Aujourd\'hui', fill: 'red', fontSize: 10 }} />

                        {/* Passé : Ligne de CA Réel */}
                        <Line type="monotone" dataKey="realRevenue" name="CA Réel" stroke="#10b981" strokeWidth={3} dot={false} />

                        {/* Futur : Zone d'incertitude (Marge d'erreur) */}
                        <Area
                            type="monotone"
                            dataKey="yhat_upper"
                            stroke="none"
                            fill="#3b82f6"
                            fillOpacity={0.1}
                            name="Marge haute"
                        />
                        <Area
                            type="monotone"
                            dataKey="yhat_lower"
                            stroke="none"
                            fill="#3b82f6"
                            fillOpacity={0.1}
                            name="Marge basse"
                        />

                        {/* Futur : Ligne de prédiction moyenne */}
                        <Line
                            type="monotone"
                            dataKey="yhat"
                            name="Prédiction IA"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default RevenuePredictionChart;
