import React from 'react';
import {FileText, LucideIcon} from "lucide-react";


interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
}
const StatCard = ({ label, value, icon: Icon, color }: StatCardProps) => {



    return (
        <div>
            <div key={label} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
                <div className={`${color} p-3 rounded-lg text-white`}><Icon size={22} /></div>
                <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );
};

export default StatCard;