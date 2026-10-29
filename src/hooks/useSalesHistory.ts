// src/hooks/useSalesHistory.ts

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PriceType, SalesHistory } from "../types";

const STORAGE_KEY = "@sales_history_v1";
const WINDOW_DAYS = 30; // last 30 days

export interface SaleItem {
    productId: string;
    name: string;
    priceType: PriceType;
    qty: number;
    revenue: number;
}

// Data LOCAL (toISOString usaria UTC e jogaria vendas da noite para o dia seguinte)
const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const prune = (h: SalesHistory): SalesHistory => {
    const limit = new Date();
    limit.setDate(limit.getDate() - (WINDOW_DAYS - 1));
    const min = dayKey(limit);
    return Object.fromEntries(Object.entries(h).filter(([k]) => k >= min));
};

const read = async (): Promise<SalesHistory> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        return prune(raw ? JSON.parse(raw) : {});
    } catch {
        return {};
    }
};

export function useSalesHistory() {
    const [history, setHistory] = useState<SalesHistory>({});

    useEffect(() => {
        read().then(setHistory);
    }, []);

    const recordSale = useCallback(async (items: SaleItem[]) => {
        if (items.length === 0) return;
        const current = await read();
        const key = dayKey(new Date());
        const day = current[key] ?? { sales: 0, revenue: 0, products: {} };
        day.sales += 1;
        for (const it of items) {
            const p = day.products[it.productId] ?? { name: it.name, priceType: it.priceType, qty: 0, revenue: 0 };
            p.name = it.name;
            p.qty = Math.round((p.qty + it.qty) * 1000) / 1000;
            p.revenue = Math.round((p.revenue + it.revenue) * 100) / 100;
            day.products[it.productId] = p;
            day.revenue = Math.round((day.revenue + it.revenue) * 100) / 100;
        }
        current[key] = day;
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch { }
        setHistory(current);
    }, []);

    return { history, recordSale };
}