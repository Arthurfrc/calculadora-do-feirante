// src/modals/QuickProductModal.tsx

import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PriceType } from "../types";
import { formatPriceInput, parsePriceInput } from "../utils/formatters";

interface Props {
    visible: boolean;
    onClose: () => void;
    onSave: (data: { name: string; price: number; priceType: PriceType }) => void;
    initialName?: string;
}

export function QuickProductModal({ visible, onClose, onSave, initialName = "" }: Props) {
    const [name, setName] = useState(initialName);
    const [price, setPrice] = useState("");
    const [priceType, setPriceType] = useState<PriceType>("kg");
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        setName(initialName);
    }, [initialName]);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', e =>
            setKeyboardHeight(e.endCoordinates.height)
        );
        const hide = Keyboard.addListener('keyboardDidHide', () =>
            setKeyboardHeight(0)
        );
        return () => { show.remove(); hide.remove(); };
    }, []);

    const handleSave = () => {
        if (!name.trim() || !price) return;

        const priceValue = parsePriceInput(price);
        if (isNaN(priceValue) || priceValue <= 0) return;

        onSave({
            name: name.trim(),
            price: priceValue,
            priceType,
        });

        // Reset form
        setName("");
        setPrice("");
    };

    const isValid = name.trim() && price;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={[styles.modalSheet, { marginBottom: keyboardHeight }]}
                >
                    <View style={styles.modalHandle} />

                    <Text style={styles.modalTitle}>
                        Cadastrar Produto
                    </Text>

                    <Text style={styles.description}>
                        Preencha os dados do produto para adicionar ao catálogo.
                    </Text>

                    <Text style={styles.inputLabel}>
                        Nome do produto
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Ex: Tomate"
                        placeholderTextColor="#bbb"
                        maxLength={40}
                        autoFocus
                        returnKeyType="next"
                    />

                    <Text style={styles.inputLabel}>
                        Preço (R$)
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={price}
                        onChangeText={(t) => setPrice(formatPriceInput(t))}
                        placeholder="0,00"
                        placeholderTextColor="#bbb"
                        keyboardType="numeric"
                        returnKeyType="next"
                    />

                    <Text style={styles.inputLabel}>
                        Tipo de venda
                    </Text>

                    <View style={styles.typeSelector}>
                        <TouchableOpacity
                            style={[styles.typeButton, priceType === "kg" && styles.typeButtonActive]}
                            onPress={() => setPriceType("kg")}
                        >
                            <Ionicons
                                name="scale"
                                size={20}
                                color={priceType === "kg" ? "#fff" : "#666"}
                            />
                            <Text style={[styles.typeButtonText, priceType === "kg" && styles.typeButtonTextActive]}>
                                Por kg
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.typeButton, priceType === "unit" && styles.typeButtonActive]}
                            onPress={() => setPriceType("unit")}
                        >
                            <Ionicons
                                name="cube"
                                size={20}
                                color={priceType === "unit" ? "#fff" : "#666"}
                            />
                            <Text style={[styles.typeButtonText, priceType === "unit" && styles.typeButtonTextActive]}>
                                Por unidade
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        activeOpacity={0.8}
                        disabled={!isValid}
                    >
                        <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#fff"
                        />

                        <Text style={styles.saveButtonText}>
                            Cadastrar e Adicionar
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onClose}
                    >
                        <Text style={styles.cancelButtonText}>
                            Cancelar
                        </Text>
                    </TouchableOpacity>

                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const LABEL_COLOR = "#888";

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#ddd", alignSelf: "center", marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
    description: { fontSize: 14, color: LABEL_COLOR, marginBottom: 18 },
    inputLabel: { fontSize: 12, fontWeight: "600", color: LABEL_COLOR, letterSpacing: 0.4, marginBottom: 6, marginTop: 12 },
    input: { borderWidth: 1.5, borderColor: "#2196f3", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: "#1a1a1a", fontWeight: "600" },
    typeSelector: { flexDirection: "row", gap: 12, marginTop: 4 },
    typeButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: "#ddd", borderRadius: 8, paddingVertical: 12, backgroundColor: "#fafafa" },
    typeButtonActive: { backgroundColor: "#2196f3", borderColor: "#2196f3" },
    typeButtonText: { fontSize: 14, fontWeight: "600", color: "#666" },
    typeButtonTextActive: { color: "#fff" },
    saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#2e7d32", borderRadius: 10, paddingVertical: 14, marginTop: 18, gap: 8 },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    cancelButton: { alignItems: "center", paddingVertical: 14, marginTop: 8 },
    cancelButtonText: { color: "#666", fontSize: 14, fontWeight: "600" }
});
