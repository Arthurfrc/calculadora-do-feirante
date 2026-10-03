// src/modals/ShareModal.tsx

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Conference, WeightItem } from "../types";
import { formatDate, formatWeight, formatCurrency, getDisplayName } from "../utils/formatters";

interface Props {
    visible: boolean;
    onClose: () => void;
    slots: (Conference | null)[];
    currentSlot: number | null;
    currentItems: WeightItem[];
    currentCustomTitle: string;
    onShareWhatsApp: (conference: Conference, phone: string) => void;
    onSharePDF: (conference: Conference) => void;
    onQuickSave: () => void;
    readSlots: () => Promise<(Conference | null)[]>;
    setSlots: (slots: (Conference | null)[]) => void;
    isPremium: boolean;
}

export function ShareModal({ visible, onClose, slots, currentSlot, currentItems, currentCustomTitle, onShareWhatsApp, onSharePDF, onQuickSave, readSlots, setSlots, isPremium }: Props) {
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [shareMethod, setShareMethod] = useState<"whatsapp" | "pdf" | null>(null);
    const [phoneInput, setPhoneInput] = useState("");
    const [justSaved, setJustSaved] = useState(false);
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

    useEffect(() => {
        if (!visible) {
            setSelectedSlot(null);
            setShareMethod(null);
            setPhoneInput("");
        }
    }, [visible]);

    const selectedConference = selectedSlot !== null ? slots[selectedSlot] : null;

    const handleSelectSlot = (index: number) => {
        setSelectedSlot(index);
        setShareMethod(null);
        setPhoneInput("");
    };

    const handleBack = () => {
        setSelectedSlot(null);
        setShareMethod(null);
        setPhoneInput("");
    };

    const handleShareWhatsApp = () => {
        if (selectedConference && phoneInput.trim()) {
            onShareWhatsApp(selectedConference, phoneInput.trim());
            onClose();
            handleBack();
        }
    };

    const handleSharePDF = () => {
        if (selectedConference) {
            onSharePDF(selectedConference);
            onClose();
            handleBack();
        }
    };

    const hasUnsavedChanges = (): boolean => {
        if (justSaved) return false;
        if (currentItems.length === 0) return false; // Lista vazia: nada a salvar, libera o picker
        if (currentSlot === null) return true; // Nunca salvo = tem alterações

        const savedConference = slots[currentSlot - 1];
        if (!savedConference) return true;

        // Comparar itens
        if (currentItems.length !== savedConference.items.length) return true;

        for (let i = 0; i < currentItems.length; i++) {
            if (currentItems[i].productId !== savedConference.items[i].productId) return true;
            if (currentItems[i].qty !== savedConference.items[i].qty) return true;
        }

        // Comparar título
        if (currentCustomTitle !== (savedConference.customTitle || "")) return true;

        return false;
    };

    const formatConferenceText = (conf: Conference): string => {
        const lines: string[] = [];
        lines.push(`📋 "${getDisplayName(conf)}"\n`);

        [...conf.items].sort((a, b) => a.productName.localeCompare(b.productName)).forEach(item => {
            const qtyText = item.productPriceType === 'kg'
                ? `${formatWeight(item.qty)} kg`
                : `${item.qty} un`;
            lines.push(`${item.productName} × ${qtyText} = ${formatWeight(item.totalWeight)} kg`);
        });

        lines.push("─────────────────");
        const totalWeight = conf.items.reduce((sum, i) => sum + i.totalWeight, 0);
        const totalValue = conf.items.reduce((sum, i) => sum + i.subtotal, 0);
        lines.push(`Peso total: ${formatWeight(totalWeight)} kg`);
        lines.push(`Valor total: ${formatCurrency(totalValue)}`);

        return lines.join("\n");
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, shareMethod === "whatsapp" && { marginBottom: keyboardHeight }]}>
                    <View style={styles.modalHandle} />

                    {/* Seleção de Lista */}
                    {selectedSlot === null && (
                        <>
                            <Text style={styles.modalTitle}>Compartilhar Pesagem</Text>

                            {/* AVISO DE ALTERAÇÕES NÃO SALVAS */}
                            {hasUnsavedChanges() && (
                                <View style={styles.warningBox}>
                                    <Ionicons name="warning" size={24} color="#ff9800" />
                                    <View style={styles.warningTextContainer}>
                                        <Text style={styles.warningTitle}>Atenção!</Text>
                                        <Text style={styles.warningMessage}>
                                            Você tem alterações não salvas. Salve antes de compartilhar.
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
                                <Text style={styles.emptyText}>Nenhuma conferência salva ainda.</Text>
                            ) : (
                                <ScrollView style={styles.slotsScroll}>
                                    {slots.map((conf, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={[styles.slotRow, !conf && styles.slotRowDisabled, hasUnsavedChanges() && styles.slotRowBlocked]}
                                            onPress={() => conf && !hasUnsavedChanges() && handleSelectSlot(i)}
                                            activeOpacity={conf && !hasUnsavedChanges() ? 0.7 : 1}
                                            disabled={!conf || hasUnsavedChanges()}
                                        >
                                            <View style={[styles.slotBadge, conf ? styles.slotBadgeFull : styles.slotBadgeEmpty]}>
                                                <Text style={styles.slotBadgeText}>{i + 1}</Text>
                                            </View>
                                            {conf ? (
                                                <View style={styles.slotInfo}>
                                                    <Text style={styles.slotName} numberOfLines={1}>{getDisplayName(conf)}</Text>
                                                    <Text style={styles.slotMeta}>
                                                        {formatDate(conf.date)} · {conf.items.length} itens · {formatWeight(conf.items.reduce((s, it) => s + it.totalWeight, 0))} kg
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text style={styles.slotEmpty}>Slot vazio</Text>
                                            )}
                                            <Ionicons name="chevron-forward" size={16} color="#ccc" />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </>
                    )}

                    {/* Seleção de Método de Compartilhamento */}
                    {selectedSlot !== null && !shareMethod && selectedConference && (
                        <>
                            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={20} color="#555" />
                                <Text style={styles.backButtonText}>Voltar</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Como compartilhar?</Text>

                            <View style={styles.previewBox}>
                                <Text style={styles.previewText}>{formatConferenceText(selectedConference)}</Text>
                            </View>

                            {isPremium &&
                                <TouchableOpacity
                                    style={styles.shareOption}
                                    onPress={() => setShareMethod("whatsapp")}
                                >
                                    <Ionicons name="logo-whatsapp" size={32} color="#25D366" />
                                    <View style={styles.shareOptionText}>
                                        <Text style={styles.shareOptionTitle}>WhatsApp</Text>
                                        <Text style={styles.shareOptionDesc}>Enviar para um contato</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                                </TouchableOpacity>
                            }

                            {isPremium &&
                                <TouchableOpacity
                                    style={styles.shareOption}
                                    onPress={() => setShareMethod("pdf")}
                                >
                                    <Ionicons name="document-text" size={32} color="#2196f3" />
                                    <View style={styles.shareOptionText}>
                                        <Text style={styles.shareOptionTitle}>PDF</Text>
                                        <Text style={styles.shareOptionDesc}>Gerar documento para compartilhar</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                                </TouchableOpacity>
                            }
                        </>
                    )}

                    {/* Input para WhatsApp */}
                    {shareMethod === "whatsapp" && selectedConference && (
                        <>
                            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={20} color="#555" />
                                <Text style={styles.backButtonText}>Voltar</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Enviar via WhatsApp</Text>
                            <Text style={styles.inputLabel}>DDD + Número</Text>
                            <TextInput
                                style={styles.phoneInput}
                                value={phoneInput}
                                onChangeText={setPhoneInput}
                                placeholder="Ex: 11999999999"
                                placeholderTextColor="#aaa"
                                keyboardType="phone-pad"
                                maxLength={11}
                            />
                            <TouchableOpacity
                                style={[styles.shareButton, !phoneInput.trim() && styles.shareButtonDisabled]}
                                onPress={handleShareWhatsApp}
                                disabled={!phoneInput.trim()}
                            >
                                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                                <Text style={styles.shareButtonText}>Enviar no WhatsApp</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Confirmação PDF */}
                    {shareMethod === "pdf" && selectedConference && (
                        <>
                            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={20} color="#555" />
                                <Text style={styles.backButtonText}>Voltar</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Gerar PDF</Text>

                            <View style={styles.previewBox}>
                                <Text style={styles.previewText}>{formatConferenceText(selectedConference)}</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.shareButton}
                                onPress={handleSharePDF}
                            >
                                <Ionicons name="document-text" size={20} color="#fff" />
                                <Text style={styles.shareButtonText}>Gerar e Compartilhar PDF</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                        <Text style={styles.modalCloseText}>Cancelar</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const LABEL_COLOR = "#888";

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: "90%" },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#ddd", alignSelf: "center", marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginBottom: 16 },
    emptyText: { textAlign: "center", color: LABEL_COLOR, marginTop: 40, fontSize: 15 },

    slotsScroll: { maxHeight: 400 },
    slotRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
    slotRowDisabled: { opacity: 0.4 },
    slotBadge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 12 },
    slotBadgeFull: { backgroundColor: "#1a1a1a" },
    slotBadgeEmpty: { backgroundColor: "#e0e0e0" },
    slotBadgeText: { fontSize: 13, fontWeight: "700", color: "#fff" },
    slotInfo: { flex: 1 },
    slotName: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
    slotMeta: { fontSize: 12, color: "#888", marginTop: 2 },
    slotEmpty: { fontSize: 14, color: "#bbb", fontStyle: "italic" },

    backButton: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    backButtonText: { fontSize: 14, color: "#555", marginLeft: 4 },

    previewBox: { backgroundColor: "#f8f8f8", borderRadius: 8, padding: 12, marginBottom: 16 },
    previewText: { fontSize: 13, color: "#333", lineHeight: 20 },

    shareOption: { flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
    shareOptionText: { flex: 1, marginLeft: 12 },
    shareOptionTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
    shareOptionDesc: { fontSize: 13, color: "#888", marginTop: 2 },

    inputLabel: { fontSize: 14, fontWeight: "600", color: "#1a1a1a", marginBottom: 8 },
    phoneInput: { borderWidth: 1.5, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 16, color: "#333" },

    shareButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#25D366", borderRadius: 10, paddingVertical: 14, marginTop: 8 },
    shareButtonDisabled: { backgroundColor: "#ccc" },
    shareButtonText: { color: "#fff", fontSize: 16, fontWeight: "700", marginLeft: 8 },

    modalCloseButton: { backgroundColor: "#f0f0f0", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
    modalCloseText: { color: "#555", fontSize: 16, fontWeight: "600" },

    warningBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff3e0", borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#ffb74d" },
    warningTextContainer: { flex: 1, marginLeft: 12 },
    warningTitle: { fontSize: 14, fontWeight: "700", color: "#e65100", marginBottom: 2 },
    warningMessage: { fontSize: 12, color: "#bf360c" },
    quickSaveButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#25D366", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8 },
    quickSaveButtonText: { color: "#fff", fontSize: 12, fontWeight: "700", marginLeft: 4 },
    slotRowBlocked: { opacity: 0.5 },
});
