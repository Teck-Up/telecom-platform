import React, { useEffect, useState } from 'react';
import api from "../../services/api.ts";
import { AlertTriangle, FileText, TrendingUp, Users } from "lucide-react";
import StatCard from "../common/StatCard.tsx";

const StatsOverview = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Fonction de formatage monétaire
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(n);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const r = await api.get('/dashboard/stats');
                setStats(r.data.data);
            } catch (error) {
                console.error("Erreur stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // On prépare les données pour les cartes
    const cards = [
        { label: 'Chiffre d\'Affaires', value: fmt(stats?.totals?.total_ca || 0), icon: TrendingUp, color: 'bg-blue-500' },
        { label: 'Impayés', value: fmt(stats?.totals?.total_unpaid || 0), icon: AlertTriangle, color: 'bg-red-500' },
        { label: 'Clients Actifs', value: stats?.totals?.total_clients || 0, icon: Users, color: 'bg-green-500' },
        { label: 'Factures en retard', value: stats?.totals?.overdue_count || 0, icon: FileText, color: 'bg-orange-500' },
    ];

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
        </div>
    );

    return (
        /* On utilise une grille responsive : 1 col sur mobile, 2 sur tablette, 4 sur desktop */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, index) => (
                <StatCard
                    key={index}
                    label={card.label}
                    value={card.value}
                    icon={card.icon}
                    color={card.color}
                />
            ))}
        </div>
    );
};

export default StatsOverview;
