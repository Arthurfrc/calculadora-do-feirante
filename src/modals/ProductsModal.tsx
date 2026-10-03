// src/modals/ProductsModal.tsx

import React, { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Product, PriceType } from "../types";
import { formatPriceInput, parsePriceInput } from "../utils/formatters";

interface Props {
    visible: boolean;
    onClose: () => void;
    products: Product[];
    onAddProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<Product>;
    onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
    onDeleteProduct: (id: string) => Promise<void>;
}

export function ProductsModal({ visible, onClose, products, onAddProduct, onUpdateProduct, onDeleteProduct }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [priceType, setPriceType] = useState<PriceType>("kg");

    // Reset state when modal closes
    React.useEffect(() => {
        if (!visible) {
            setIsEditing(false);
            setEditingProduct(null);
            setName("");
            setPrice("");
            setPriceType("kg");
        }
    }, [visible]);

    const handleEdit = (product: Product) => {
        setIsEditing(true);
        setEditingProduct(product);
        setName(product.name);
        setPrice(product.price.toString().replace(".", ","));
        setPriceType(product.priceType);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingProduct(null);
        setName("");
        setPrice("");
        setPriceType("kg");
    };

    const handleNewProduct = () => {
        setIsEditing(true);
        setEditingProduct(null);
        setName("");
        setPrice("");
        setPriceType("kg");
    };

    const handleSave = async () => {
        if (!name.trim() || !price) return;

        const priceValue = parsePriceInput(price);
        if (isNaN(priceValue) || priceValue <= 0) {
            Alert.alert("Erro", "Preço inválido");
            return;
        }

        if (editingProduct) {
            await onUpdateProduct(editingProduct.id, {
                name: name.trim(),
                price: priceValue,
                priceType,
            });
        } else {
            await onAddProduct({
                name: name.trim(),
                price: priceValue,
                priceType,
            });
        }

        handleCancelEdit();
    };

    const handleDelete = (product: Product) => {
        Alert.alert(
            "Excluir produto?",
            `"${product.name}" será removido do catálogo.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir",
                    style: "destructive",
                    onPress: () => onDeleteProduct(product.id),
                },
            ]
        );
    };

    const isValid = name.trim() && price;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
                    <View style={styles.modalHandle} />

                    {isEditing ? (
                        <>
                            <TouchableOpacity onPress={handleCancelEdit} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={20} color="#555" />
                                <Text style={styles.backButtonText}>Voltar</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>
                                {editingProduct ? "Editar Produto" : "Novo Produto"}
                            </Text>

                            <Text style={styles.inputLabel}>Nome do produto</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Ex: Tomate"
                                placeholderTextColor="#bbb"
                                maxLength={40}
                            />

                            <Text style={styles.inputLabel}>Preço (R$)</Text>
                            <TextInput
                                style={styles.input}
                                value={price}
                                onChangeText={(t) => setPrice(formatPriceInput(t))}
                                placeholder="0,00"
                                placeholderTextColor="#bbb"
                                keyboardType="numeric"
                            />

                            <Text style={styles.inputLabel}>Tipo de venda</Text>
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
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                <Text style={styles.saveButtonText}>Salvar</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.modalTitle}>Catálogo de Produtos</Text>

                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={handleNewProduct}
                            >
                                <Ionicons name="add-circle" size={20} color="#fff" />
                                <Text style={styles.addButtonText}>Novo Produto</Text>
                            </TouchableOpacity>

                            <ScrollView style={styles.productsList}>
                                {products.length === 0 ? (
                                    <Text style={styles.emptyText}>Nenhum produto cadastrado.</Text>
                                ) : (
                                    products.map((product) => (
                                        <View key={product.id} style={styles.productRow}>
                                            <View style={styles.productInfo}>
                                                <Text style={styles.productName}>{product.name}</Text>
                                                <Text style={styles.productPrice}>
                                                    R$ {product.price.toFixed(2)}/{product.priceType === 'kg' ? 'kg' : 'un'}
                                                </Text>
                                            </View>
                                            <View style={styles.productActions}>
                                                <TouchableOpacity
                                                    style={styles.actionButton}
                                                    onPress={() => handleEdit(product)}
                                                >
                                                    <Ionicons name="create" size={20} color="#2196f3" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.actionButton}
                                                    onPress={() => handleDelete(product)}
                                                >
                                                    <Ionicons name="trash" size={20} color="#e53935" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        </>
                    )}

                    <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                        <Text style={styles.modalCloseText}>Fechar</Text>
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
    backButton: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    backButtonText: { fontSize: 14, color: "#555", marginLeft: 4 },
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
    addButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#2196f3", borderRadius: 10, paddingVertical: 14, gap: 8, marginBottom: 16 },
    addButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    productsList: { maxHeight: 400 },
    emptyText: { textAlign: "center", color: LABEL_COLOR, marginTop: 40, fontSize: 15 },
    productRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
    productInfo: { flex: 1 },
    productName: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
    productPrice: { fontSize: 13, color: "#666", marginTop: 2 },
    productActions: { flexDirection: "row", gap: 8 },
    actionButton: { padding: 8 },
    modalCloseButton: { backgroundColor: "#f0f0f0", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
    modalCloseText: { color: "#555", fontSize: 16, fontWeight: "600" },
});
