// src/hooks/useTrial.ts

import { useState, useEffect, useCallback } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";

const LAST_ONLINE_KEY = "@trial_last_online_v1";
const TRIAL_DAYS = parseInt(process.env.EXPO_PUBLIC_TRIAL_DAYS || "30");
const DAY_MS = 24 * 60 * 60 * 1000;

// Hora real: cabeçalho Date de uma resposta HTTPS (não depende do relógio do celular)
const fetchOnlineTime = async (): Promise<number | null> => {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("https://www.google.com/generate_204", { signal: controller.signal });
        clearTimeout(timer);
        const date = res.headers.get("date");
        const t = date ? new Date(date).getTime() : NaN;
        return isNaN(t) ? null : t;
    } catch {
        return null;
    }
};

const calc = (install: number, now: number) => {
    const end = install + TRIAL_DAYS * DAY_MS;
    return { trialActive: now < end, daysLeft: Math.max(0, Math.ceil((end - now) / DAY_MS)) };
};

export function useTrial() {
    const [state, setState] = useState({ trialActive: false, daysLeft: 0 });

    const check = useCallback(async () => {
        try {
            const install = (await Application.getInstallationTimeAsync()).getTime();
            const raw = await AsyncStorage.getItem(LAST_ONLINE_KEY);
            const lastOnline = raw ? Number(raw) || 0 : 0;

            // 1) imediato (funciona offline): relógio do celular, nunca antes da última hora online
            setState(calc(install, Math.max(Date.now(), lastOnline)));

            // 2) hora online, quando houver internet
            const online = await fetchOnlineTime();
            if (online) {
                await AsyncStorage.setItem(LAST_ONLINE_KEY, String(Math.max(lastOnline, online)));
                setState(calc(install, online));
            }
        } catch {
            // sem como medir: não libera
        }
    }, []);

    useEffect(() => {
        check();
        const sub = AppState.addEventListener("change", (s) => { if (s === "active") check(); });
        return () => sub.remove();
    }, [check]);

    return state;
}