//src/utils/formatters.ts

import { Conference } from "../types";

export const formatWeight = (value: number): string =>
    value.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export const formatCurrency = (value: number): string =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatPriceInput = (value: string): string => {
    const n = value.replace(/[^\d]/g, "");
    if (!n) return "";
    return (parseInt(n) / 100).toFixed(2).replace(".", ",");
};

export const parsePriceInput = (value: string): number =>
    parseInt(value.replace(/[^\d]/g, "")) / 100 || 0;

export const formatWeightInput = (value: string): string => {
    const n = value.replace(/[^\d]/g, "");
    if (!n) return "";
    return (parseInt(n) / 1000).toLocaleString("pt-BR", {
        minimumFractionDigits: 3, maximumFractionDigits: 3,
    });
};

export const parseWeightInput = (value: string): number =>
    parseInt(value.replace(/[^\d]/g, "")) / 1000 || 0;

export const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });

export const generateConferenceName = (): string => {
    const now = new Date();
    return `Pesagem ${now.getDate()}/${now.getMonth() + 1} ${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;
};

export const getDisplayName = (conference: Conference): string =>
    conference.customTitle || conference.name;
