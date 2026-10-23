// src/modals/PriceInputModal.tsx

import React, { useState, useEffect } from "react";
import { Modal, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatPriceInput } from "../utils/formatters";

interface Props {
    visible: boolean;
    value: string;
    solMode?: boolean;
    onConfirm: (value: string) => void;
    onClose: () => void;
}

export function PriceInputModal({ visible, value, solMode, onConfirm, onClose }: Props) {
    const [draft, setDraft] = useState(value);

    useEffect(() => {
        if (visible) setDraft(value);
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={[styles.card, solMode && sol.card]}>
                    <Text style={[styles.label, solMode && sol.label]}>Preço (R$)</Text>
                    <TextInput
                        style={[styles.input, solMode && sol.input]}
                        value={draft}
                        onChangeText={(t) => setDraft(formatPriceInput(t))}
                        placeholder="0,00"
                        placeholderTextColor="#bbb"
                        keyboardType="numeric"
                        autoFocus
                        selectTextOnFocus
                        onSubmitEditing={() => onConfirm(draft)}
                    />
                    <TouchableOpacity style={styles.okButton} onPress={() => onConfirm(draft)} activeOpacity={0.8}>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.okText}>OK</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-start", alignItems: "center", paddingTop: 80 },
    card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "90%", maxWidth: 340 },
    label: { fontSize: 12, fontWeight: "600", color: "#888", letterSpacing: 0.4, marginBottom: 6 },
    input: { borderWidth: 1.5, borderColor: "#2196f3", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 18, color: "#1a1a1a", fontWeight: "700" },
    okButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#2e7d32", borderRadius: 10, paddingVertical: 14, marginTop: 16, gap: 8 },
    okText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

// ─── Modo sol (SÓ cores) ───
const sol = StyleSheet.create({
    card: { backgroundColor: "#000", borderWidth: 1, borderColor: "#ff0" },
    label: { color: "#ddd" },
    input: { backgroundColor: "#222", color: "#fff", borderColor: "#ff0" },
});