// src/modals/FinalizeModal.tsx

import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Product } from "../types";
import { formatWeight, formatCurrency, formatPriceInput, parsePriceInput } from "../utils/formatters";

interface Props {
    visible: boolean;
    onClose: () => void;
    solMode?: boolean;
    products: Product[];
    quantities: Record<string, number>;
    totalValue: number;
    totalWeight: number;
    totalQty: number;
}

export function FinalizeModal({ solMode, visible, onClose, products, quantities, totalValue, totalWeight, totalQty }: Props) {
    const [amountReceived, setAmountReceived] = useState("");

    // Reset amount received when modal opens
    React.useEffect(() => {
        if (visible) {
            setAmountReceived("");
        }
    }, [visible]);

    const activeProducts = products.filter(p => quantities[p.id] && quantities[p.id] > 0);
    const received = parsePriceInput(amountReceived);
    const change = received - totalValue;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, solMode && sol.modalSheet]}>
                    <View style={[styles.modalHandle, solMode && sol.modalHandle]} />

                    <Text style={[styles.modalTitle, solMode && sol.modalTitle]}>Resumo da Compra</Text>

                    <View style={[styles.summaryContainer, solMode && sol.summaryContainer]}>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryLabel, solMode && sol.summaryLabel]}>Itens</Text>
                            <Text style={[styles.summaryValue, solMode && sol.summaryValue]}>{totalQty}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryLabel, solMode && sol.summaryLabel]}>Peso Total</Text>
                            <Text style={[styles.summaryValue, solMode && sol.summaryValue]}>{formatWeight(totalWeight)} kg</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryLabel, solMode && sol.summaryLabel]}>Valor Total</Text>
                            <Text style={[styles.summaryValue, solMode && sol.summaryValue, styles.summaryValueHighlight, solMode && sol.summaryValueHighlight]}>{formatCurrency(totalValue)}</Text>
                        </View>
                    </View>

                    <ScrollView style={styles.productsList}>
                        {activeProducts.map((product) => {
                            const qty = quantities[product.id] || 0;
                            const subtotal = qty * product.price;
                            return (
                                <View key={product.id} style={[styles.productRow, solMode && sol.productRow]}>
                                    <View style={styles.productInfo}>
                                        <Text style={[styles.productName, solMode && sol.productName]}>{product.name}</Text>
                                        <Text style={[styles.productPrice, solMode && sol.productPrice]}>
                                            R$ {product.price.toFixed(2)}/{product.priceType === 'kg' ? 'kg' : 'un'}
                                        </Text>
                                    </View>
                                    <View style={styles.productTotals}>
                                        <Text style={[styles.productQty, solMode && sol.productQty]}>
                                            {product.priceType === 'kg' ? formatWeight(qty) + ' kg' : qty + ' un'}
                                        </Text>
                                        <Text style={[styles.productSubtotal, solMode && sol.productSubtotal]}>
                                            {formatCurrency(subtotal)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.paymentSection}>
                        <Text style={[styles.paymentLabel, solMode && sol.paymentLabel]}>Valor recebido</Text>
                        <TextInput
                            style={[styles.paymentInput, solMode && sol.paymentInput]}
                            value={amountReceived}
                            onChangeText={(text) => setAmountReceived(formatPriceInput(text))}
                            keyboardType="numeric"
                            placeholder="0,00"
                            placeholderTextColor="#aaa"
                        />
                    </View>

                    {amountReceived && (
                        <View style={[styles.changeContainer, change >= 0 ? styles.changeContainerPositive : styles.changeContainerNegative, solMode && (change >= 0 ? sol.changeContainerPositive : sol.changeContainerNegative)]}>
                            <Text style={[styles.changeLabel, solMode && sol.changeLabel]}>
                                {change >= 0 ? "Troco" : "Falta"}
                            </Text>
                            <Text style={[change >= 0 ? styles.changeValuePositive : styles.changeValueNegative, solMode && (change >= 0 ? sol.changeValuePositive : sol.changeValueNegative)]}>
                                {formatCurrency(Math.abs(change))}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity style={[styles.closeButton, solMode && sol.closeButton]} onPress={onClose}>
                        <Text style={[styles.closeButtonText, solMode && sol.closeButtonText]}>Fechar</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: "90%" },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#ddd", alignSelf: "center", marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginBottom: 16 },
    summaryContainer: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#f5f5f5", borderRadius: 12, padding: 16, marginBottom: 16 },
    summaryItem: { alignItems: "center" },
    summaryLabel: { fontSize: 11, color: "#888", fontWeight: "600", marginBottom: 4 },
    summaryValue: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
    summaryValueHighlight: { fontSize: 20, color: "#2e7d32" },
    productsList: { maxHeight: 300 },
    productRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
    productInfo: { flex: 1 },
    productName: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
    productPrice: { fontSize: 12, color: "#666", marginTop: 2 },
    productTotals: { alignItems: "flex-end" },
    productQty: { fontSize: 13, color: "#666", marginBottom: 2 },
    productSubtotal: { fontSize: 15, fontWeight: "700", color: "#2e7d32" },
    paymentSection: { paddingHorizontal: 16, marginTop: 16 },
    paymentLabel: { fontSize: 14, fontWeight: "600", color: "#666", marginBottom: 8 },
    paymentInput: {
        borderWidth: 1.5,
        borderColor: "#2196f3",
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === "ios" ? 12 : 10,
        fontSize: 18,
        color: "#1a1a1a",
        backgroundColor: "#fafafa",
        textAlign: "right",
        fontWeight: "700",
    },
    changeContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 12,
        borderRadius: 8,
    },
    changeContainerPositive: { backgroundColor: "#e8f5e9" },
    changeContainerNegative: { backgroundColor: "#ffebee" },
    changeLabel: { fontSize: 16, fontWeight: "600" },
    changeValuePositive: { fontSize: 20, fontWeight: "700", color: "#2e7d32" },
    changeValueNegative: { fontSize: 20, fontWeight: "700", color: "#e53935" },
    closeButton: { backgroundColor: "#f0f0f0", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
    closeButtonText: { color: "#555", fontSize: 16, fontWeight: "600" },
});

// ─── Modo sol (SÓ cores) ───
const sol = StyleSheet.create({
    modalSheet: { backgroundColor: "#000", borderTopWidth: 1, borderColor: "#ff0" },
    modalHandle: { backgroundColor: "#555" },
    modalTitle: { color: "#fff" },
    summaryContainer: { backgroundColor: "#222" },
    summaryLabel: { color: "#ddd" },
    summaryValue: { color: "#fff" },
    summaryValueHighlight: { color: "#ff0" },
    productRow: { borderBottomColor: "#444" },
    productName: { color: "#fff" },
    productPrice: { color: "#ddd" },
    productQty: { color: "#ddd" },
    productSubtotal: { color: "#ff0" },
    paymentLabel: { color: "#ddd" },
    paymentInput: { backgroundColor: "#222", color: "#fff", borderColor: "#ff0" },
    changeContainerPositive: { backgroundColor: "#1c1c00" },
    changeContainerNegative: { backgroundColor: "#3b0000" },
    changeLabel: { color: "#fff" },
    changeValuePositive: { color: "#ff0" },
    changeValueNegative: { color: "#ff5252" },
    closeButton: { backgroundColor: "#333" },
    closeButtonText: { color: "#fff" },
});
