// src/components/ProductAutocomplete.tsx

import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Keyboard, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Product } from "../types";

interface Props {
    products: Product[];
    value: string;
    onChangeText: (text: string) => void;
    onSelectProduct: (product: Product) => void;
    onCreateNew: () => void;
    placeholder?: string;
}

export function ProductAutocomplete({
    products,
    value,
    onChangeText,
    onSelectProduct,
    onCreateNew,
    placeholder = "Buscar produto...",
}: Props) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (value.trim()) {
            const lowerQuery = value.toLowerCase();
            const filtered = products.filter(p =>
                p.name.toLowerCase().includes(lowerQuery)
            );
            setFilteredProducts(filtered);
            setShowDropdown(filtered.length > 0);
        } else {
            setFilteredProducts([]);
            setShowDropdown(false);
        }
    }, [value, products]);

    const handleFocus = () => {
        if (value.trim()) {
            setShowDropdown(true);
        }
    };

    const handleBlur = () => {
        // Delay to allow tapping on dropdown items
        setTimeout(() => setShowDropdown(false), 200);
    };

    const handleSelectProduct = (product: Product) => {
        onSelectProduct(product);
        onChangeText("");
        setFilteredProducts([]);
        setShowDropdown(false);
        Keyboard.dismiss();
    };

    const handleCreateNew = () => {
        onCreateNew();
        setShowDropdown(false);
    };

    const renderItem = ({ item }: { item: Product }) => (
        <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => handleSelectProduct(item)}
        >
            <View style={styles.itemContent}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemDetails}>
                    <Text style={styles.itemPrice}>
                        R$ {item.price.toFixed(2)}/{item.priceType === 'kg' ? 'kg' : 'un'}
                    </Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.inputWrapper}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    placeholderTextColor="#bbb"
                    autoCapitalize="words"
                    returnKeyType="search"
                />
                {value.length > 0 && (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => {
                            onChangeText("");
                            setFilteredProducts([]);
                            setShowDropdown(false);
                        }}
                    >
                        <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>

            {showDropdown && (
                <View style={styles.dropdown}>
                    <FlatList
                        data={filteredProducts}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        style={styles.dropdownList}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <TouchableOpacity
                                style={styles.createNewButton}
                                onPress={handleCreateNew}
                            >
                                <Ionicons name="add-circle" size={20} color="#2196f3" />
                                <Text style={styles.createNewText}>
                                    Cadastrar "{value}"
                                </Text>
                            </TouchableOpacity>
                        }
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { position: "relative", zIndex: 100 },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#2196f3",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === "ios" ? 14 : 10,
        backgroundColor: "#fff",
    },
    searchIcon: { marginRight: 8 },
    input: {
        flex: 1,
        fontSize: 16,
        color: "#1a1a1a",
        fontWeight: "600",
        padding: 0,
    },
    clearButton: { marginLeft: 8 },
    dropdown: {
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        borderRadius: 8,
        marginTop: 4,
        maxHeight: 200,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 1000,
    },
    dropdownList: { paddingVertical: 4 },
    dropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    itemContent: { flex: 1 },
    itemName: { fontSize: 15, fontWeight: "600", color: "#1a1a1a", marginBottom: 2 },
    itemDetails: { flexDirection: "row", alignItems: "center", gap: 4 },
    itemPrice: { fontSize: 12, color: "#666", fontWeight: "500" },
    createNewButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 8,
    },
    createNewText: { fontSize: 14, fontWeight: "600", color: "#2196f3" },
});
