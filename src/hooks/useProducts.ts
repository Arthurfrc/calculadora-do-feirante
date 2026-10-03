//src/hooks/useProducts.ts

import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product } from "../types";

const STORAGE_KEY = "@products_v1";

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([]);

    const readProducts = async (): Promise<Product[]> => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            const saved: Product[] = raw ? JSON.parse(raw) : [];
            return saved.sort((a, b) => a.name.localeCompare(b.name));
        } catch {
            return [];
        }
    };

    const writeProducts = async (updated: Product[]) => {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setProducts(updated);
    };

    const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
        const newProduct: Product = {
            ...product,
            id: Date.now().toString(),
            createdAt: Date.now(),
        };
        const updated = [...products, newProduct].sort((a, b) => a.name.localeCompare(b.name));
        await writeProducts(updated);
        return newProduct;
    };

    const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
        const updated = products.map(p => p.id === id ? { ...p, ...updates } : p);
        await writeProducts(updated);
    };

    const deleteProduct = async (id: string): Promise<void> => {
        const updated = products.filter(p => p.id !== id);
        await writeProducts(updated);
    };

    const getProductById = (id: string): Product | undefined => {
        return products.find(p => p.id === id);
    };

    const searchProducts = (query: string): Product[] => {
        if (!query.trim()) return [];
        const lowerQuery = query.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(lowerQuery));
    };

    useEffect(() => {
        readProducts().then(setProducts);
    }, []);

    return {
        products,
        setProducts,
        readProducts,
        writeProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductById,
        searchProducts,
    };
}
