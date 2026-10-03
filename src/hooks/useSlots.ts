//src/hooks/useSlots.ts

import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Conference } from "../types";

const STORAGE_KEY = "@conferences_v2";
const MAX_SLOTS = Number(process.env.EXPO_PUBLIC_MAX_SLOTS_FREE || 20)

export function useSlots(maxSlots?: number) {
    const [slots, setSlots] = useState<(Conference | null)[]>(new Array(maxSlots || MAX_SLOTS).fill(null));
    const [currentSlot, setCurrentSlot] = useState<number | null>(null);

    const readSlots = async (): Promise<(Conference | null)[]> => {
        const effectiveMax = maxSlots || MAX_SLOTS;
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            const saved: (Conference | null)[] = raw ? JSON.parse(raw) : [];
            while (saved.length < effectiveMax) saved.push(null);
            return saved.slice(0, effectiveMax);
        } catch {
            return new Array(effectiveMax).fill(null);
        }
    };

    const writeSlots = async (updated: (Conference | null)[]) => {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setSlots(updated);
    };

    return { slots, setSlots, currentSlot, setCurrentSlot, readSlots, writeSlots };
}
