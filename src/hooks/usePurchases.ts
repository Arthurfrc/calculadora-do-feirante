// src/hooks/usePurchases.ts

import { useState, useEffect } from "react";
import Purchases, { CustomerInfo, PurchasesPackage, LOG_LEVEL } from "react-native-purchases";

export function usePurchases() {
    const [isPremium, setIsPremium] = useState(false);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        initializePurchases();
    }, []);

    const initializePurchases = async () => {
        try {
            Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
            const apiKey = process.env.EXPO_PUBLIC_REVENUE_APP;      // Produção
            // const apiKey = process.env.EXPO_PUBLIC_REVENUE_APP_TESTING;     // Testes

            await Purchases.configure({ apiKey }); // ← só uma vez

            Purchases.addCustomerInfoUpdateListener((info) => {
                setCustomerInfo(info);
                setIsPremium(!!info.entitlements.active['Calculadora Feirante Premium']);
            });

            await loadCustomerInfo();
            await loadOfferings();
        } catch (error) {
            console.error('Erro ao inicializar RevenueCat:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadCustomerInfo = async () => {
        try {
            const info = await Purchases.getCustomerInfo();
            setCustomerInfo(info);
            // Verifica se o usuário tem o entitlement "premium" ativo
            setIsPremium(!!info.entitlements.active['Calculadora Feirante Premium']);
        } catch (error) {
            console.error('Erro ao carregar customer info:', error);
        }
    };

    const loadOfferings = async () => {
        try {
            const offerings = await Purchases.getOfferings();
            if (offerings.current) {
                setPackages(offerings.current?.availablePackages);
            }
        } catch (error) {
            console.error('Erro ao carregar offerings:', error);
        }
    };

    const purchasePackage = async (pkg: PurchasesPackage) => {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pkg);
            setCustomerInfo(customerInfo);
            setIsPremium(!!customerInfo.entitlements.active['Calculadora Feirante Premium']);
            return { success: true };
        } catch (error: any) {
            console.error('Erro na compra:', error);
            if (error.userCancelled) {
                return { success: false, cancelled: true };
            }
            return { success: false, error };
        }
    };

    const restorePurchases = async () => {
        try {
            const info = await Purchases.restorePurchases();
            setCustomerInfo(info);
            setIsPremium(!!info.entitlements.active['Calculadora Feirante Premium']);
            return { success: true };
        } catch (error) {
            console.error('Erro ao restaurar compras:', error);
            return { success: false, error };
        }
    };

    return {
        isLoading,
        isPremium,
        customerInfo,
        packages,
        initializePurchases,
        loadCustomerInfo,
        loadOfferings,
        purchasePackage,
        restorePurchases,
    };
}
