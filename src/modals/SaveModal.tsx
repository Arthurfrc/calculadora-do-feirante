// src/modals/SaveModal.tsx

import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props { visible: boolean; onClose: () => void; customTitle: string; onChangeTitle: (v: string) => void; onQuickSave: () => void; }

export function SaveModal({ visible, onClose, customTitle, onChangeTitle, onQuickSave }: Props) {
    const [keyboardHeight, setKeyboardHeight] = useState(0);

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
        if (!customTitle.trim()) return;
        onQuickSave();
    };

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
                        Salvar Conferência
                    </Text>

                    <Text style={styles.description}>
                        Informe um título para identificar esta pesagem.
                    </Text>

                    <Text style={styles.inputLabel}>
                        Título da pesagem
                    </Text>

                    <TextInput
                        style={styles.titleInput}
                        value={customTitle}
                        onChangeText={onChangeTitle}
                        placeholder="Ex: Carga de seu Zé"
                        placeholderTextColor="#bbb"
                        maxLength={40}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleSave}
                    />

                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            !customTitle.trim() && styles.saveButtonDisabled
                        ]}
                        onPress={handleSave}
                        activeOpacity={0.8}
                        disabled={!customTitle.trim()}
                    >
                        <Ionicons
                            name="save"
                            size={20}
                            color="#fff"
                        />

                        <Text style={styles.saveButtonText}>
                            Salvar
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
    inputLabel: { fontSize: 12, fontWeight: "600", color: LABEL_COLOR, letterSpacing: 0.4, marginBottom: 6 },
    titleInput: { borderWidth: 1.5, borderColor: "#2196f3", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: "#1a1a1a", fontWeight: "600" },
    saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#2e7d32", borderRadius: 10, paddingVertical: 14, marginTop: 18, gap: 8 },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    cancelButton: { alignItems: "center", paddingVertical: 14, marginTop: 8 },
    cancelButtonText: { color: "#666", fontSize: 14, fontWeight: "600" }
});
