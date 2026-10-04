// src/modals/LoadModal.tsx

import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Conference, Product } from "../types";
import { formatDate, formatWeight, getDisplayName } from "../utils/formatters";

interface Props {
    visible: boolean;
    solMode?: boolean;
    onClose: () => void;
    slots: (Conference | null)[];
    currentSlot: number | null;
    currentQuantities: Record<string, number>;
    currentCustomTitle: string;
    onLoadSlot: (index: number) => void;
    onDeleteSlot: (index: number) => void;
    onQuickSave: () => void;
    readSlots: () => Promise<(Conference | null)[]>;
    setSlots: (slots: (Conference | null)[]) => void;
    products: Product[];
}

export function LoadModal({ solMode, visible, onClose, slots, currentSlot, currentQuantities, currentCustomTitle, onLoadSlot, onDeleteSlot, onQuickSave, readSlots, setSlots, products }: Props) {
    const [justSaved, setJustSaved] = useState(false);
    const MAX_SLOTS_FREE = parseInt(process.env.EXPO_PUBLIC_MAX_SLOTS_FREE ?? "20");
    const usedSlots = slots.filter(Boolean).length;

    const hasUnsavedChanges = (): boolean => {
        if (justSaved) return false;
        if (Object.keys(currentQuantities).length === 0 || Object.values(currentQuantities).every(q => q === 0)) return false; // Nada preenchido
        if (currentSlot === null) return true; // Nunca salvo = tem alterações

        const savedConference = slots[currentSlot - 1];
        if (!savedConference) return true;

        // Comparar quantidades
        const savedQuantities = savedConference.quantities || {};
        const currentKeys = Object.keys(currentQuantities).filter(k => currentQuantities[k] > 0);
        const savedKeys = Object.keys(savedQuantities).filter(k => savedQuantities[k] > 0);

        if (currentKeys.length !== savedKeys.length) return true;

        for (const key of currentKeys) {
            if (currentQuantities[key] !== savedQuantities[key]) return true;
        }

        // Comparar título
        if (currentCustomTitle !== (savedConference.customTitle || "")) return true;

        return false;
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable style={[styles.modalSheet, solMode && sol.modalSheet]}>
                    <View style={[styles.modalHandle, solMode && sol.modalHandle]} />
                    <Text style={[styles.modalTitle, solMode && sol.modalTitle]}>Carregar Conferência</Text>
                    <View style={styles.counterRow}>
                        <View style={[styles.counterBarWrap, solMode && sol.counterBarWrap]}>
                            <View
                                style={[
                                    styles.counterFill,
                                    {
                                        width: `${Math.min((usedSlots / MAX_SLOTS_FREE) * 100, 100)}%`,
                                        backgroundColor:
                                            usedSlots >= MAX_SLOTS_FREE
                                                ? "#e53935"
                                                : usedSlots >= MAX_SLOTS_FREE * 0.8
                                                    ? "#ff9800"
                                                    : "#509AE2",
                                    },
                                ]}
                            />
                        </View>

                        <Text
                            style={[
                                styles.counterText, solMode && sol.counterText,
                                usedSlots >= MAX_SLOTS_FREE * 0.8 && { color: "#ff9800" },
                                usedSlots >= MAX_SLOTS_FREE && {
                                    color: "#e53935",
                                    fontWeight: "700",
                                },
                            ]}
                        >
                            {usedSlots}/{MAX_SLOTS_FREE} slots
                        </Text>
                    </View>

                    {/* AVISO DE ALTERAÇÕES NÃO SALVAS */}
                    {hasUnsavedChanges() && (
                        <View style={[styles.warningBox, solMode && sol.warningBox]}>
                            <Ionicons name="warning" size={24} color="#ff9800" />
                            <View style={styles.warningTextContainer}>
                                <Text style={[styles.warningTitle, solMode && sol.warningTitle]}>Atenção!</Text>
                                <Text style={[styles.warningMessage, solMode && sol.warningMessage]}>
                                    Você tem alterações não salvas. Salve antes de carregar.
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.quickSaveButton}
                                onPress={() => {
                                    onQuickSave();
                                    setJustSaved(true);
                                    setTimeout(() => {
                                        readSlots().then(setSlots);
                                        setJustSaved(false);
                                    }, 300);
                                }}
                            >
                                <Ionicons name="save-sharp" size={18} color="#fff" />
                                <Text style={styles.quickSaveButtonText}>Salvar Agora</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {slots.every((s) => s === null) ? (
                        <Text style={[styles.emptyText, solMode && sol.emptyText]}>Nenhuma conferência salva ainda.</Text>
                    ) : (
                        <ScrollView
                            style={{ maxHeight: 400 }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="always"
                        >
                            {slots.map((conf, i) => ({ conf, index: i })).filter(slot => slot.conf).map(({ conf, index }) => (
                                <View
                                    key={index}
                                    style={[styles.slotRow, solMode && sol.slotRow, currentSlot === index + 1 && styles.slotRowActive, solMode && currentSlot === index + 1 && sol.slotRowActive, !conf && styles.slotRowDisabled, hasUnsavedChanges() && styles.slotRowBlocked]}
                                >
                                    <View style={[styles.slotBadge, conf ? styles.slotBadgeFull : styles.slotBadgeEmpty, solMode && conf && sol.slotBadgeFull]}>
                                        <Text style={styles.slotBadgeText}>{index + 1}</Text>
                                    </View>
                                    {conf ? (
                                        <Pressable
                                            style={styles.slotInfo}
                                            onPress={() => {
                                                if (hasUnsavedChanges()) return;
                                                onLoadSlot(index);
                                            }}
                                        >
                                            <Text style={[styles.slotName, solMode && sol.slotName]} numberOfLines={1}>{getDisplayName(conf)}</Text>
                                            <Text style={[styles.slotMeta, solMode && sol.slotMeta]}>
                                                {formatDate(conf.date)} · {Object.keys(conf.quantities || {}).filter(k => conf.quantities![k] > 0).length} itens ·{" "}
                                                {formatWeight(Object.entries(conf.quantities || {}).reduce((s, [_, qty]) => s + qty, 0))} kg
                                            </Text>
                                        </Pressable>
                                    ) : (
                                        <View style={styles.slotInfo}>
                                            <Text style={[styles.slotEmpty, solMode && sol.slotEmpty]}>Slot vazio</Text>
                                        </View>
                                    )}
                                    {conf && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (hasUnsavedChanges()) return;
                                                onDeleteSlot(index);
                                            }}
                                            style={styles.deleteBtn}
                                            activeOpacity={hasUnsavedChanges() ? 1 : 0.7}
                                        >
                                            <Ionicons name="trash-outline" size={18} color={hasUnsavedChanges() ? "#ccc" : "#e53935"} />
                                        </TouchableOpacity>
                                    )}
                                    {conf && <Ionicons name="chevron-forward" size={16} color="#ccc" />}
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    <TouchableOpacity style={[styles.modalCloseButton, solMode && sol.modalCloseButton]} onPress={onClose}>
                        <Text style={[styles.modalCloseText, solMode && sol.modalCloseText]}>Fechar</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const LABEL_COLOR = "#888";

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#ddd", alignSelf: "center", marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginBottom: 16 },
    warningBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff8e1", borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#ffecb3" },
    warningTextContainer: { flex: 1, marginLeft: 12 },
    warningTitle: { fontSize: 14, fontWeight: "700", color: "#ff8f00", marginBottom: 2 },
    warningMessage: { fontSize: 12, color: "#666" },
    quickSaveButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#25D366", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
    quickSaveButtonText: { fontSize: 12, fontWeight: "700", color: "#fff", marginLeft: 4 },
    emptyText: { textAlign: "center", color: LABEL_COLOR, marginTop: 40, fontSize: 15 },
    slotRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
    slotRowActive: { backgroundColor: "#f0f7ff", borderRadius: 8, paddingHorizontal: 6 },
    slotRowDisabled: { opacity: 0.4 },
    slotBadge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 12 },
    slotBadgeFull: { backgroundColor: "#1a1a1a" },
    slotBadgeEmpty: { backgroundColor: "#e0e0e0" },
    slotBadgeText: { fontSize: 13, fontWeight: "700", color: "#fff" },
    slotInfo: { flex: 1 },
    slotName: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
    slotMeta: { fontSize: 12, color: "#888", marginTop: 2 },
    slotEmpty: { fontSize: 14, color: "#bbb", fontStyle: "italic" },
    deleteBtn: { padding: 6, marginRight: 4 },
    modalCloseButton: { backgroundColor: "#2196f3", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
    modalCloseText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    slotRowBlocked: { opacity: 0.5 },
    counterRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
    counterBarWrap: { flex: 1, height: 4, borderRadius: 99, backgroundColor: "#f0f0f0", overflow: "hidden" },
    counterFill: { height: "100%", borderRadius: 99 },
    counterText: { fontSize: 11, fontWeight: "600", color: LABEL_COLOR, minWidth: 56, textAlign: "right" },
});

// ─── Modo sol (SÓ cores) ───
const sol = StyleSheet.create({
    modalSheet: { backgroundColor: "#000", borderTopWidth: 1, borderColor: "#ff0" },
    modalHandle: { backgroundColor: "#555" },
    modalTitle: { color: "#fff" },
    warningBox: { backgroundColor: "#1c1c00", borderColor: "#ff0" },
    warningTitle: { color: "#ff0" },
    warningMessage: { color: "#ddd" },
    emptyText: { color: "#ddd" },
    slotRow: { borderBottomColor: "#444" },
    slotRowActive: { backgroundColor: "#1c1c00" },
    slotBadgeFull: { backgroundColor: "#333", borderWidth: 1, borderColor: "#ff0" },
    slotName: { color: "#fff" },
    slotMeta: { color: "#ddd" },
    slotEmpty: { color: "#ddd" },
    modalCloseButton: { backgroundColor: "#ff0" },
    modalCloseText: { color: "#000" },
    counterBarWrap: { backgroundColor: "#333" },
    counterText: { color: "#ddd" },
});
