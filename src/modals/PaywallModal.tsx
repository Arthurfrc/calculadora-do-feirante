// src/modals/PaywallModal.tsx

import React, { useState, useEffect } from "react";
import {
    Modal, View, Text, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, Platform, Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { CustomerInfo } from "react-native-purchases";

const BLUE = "#509AE2";
const GOLD = "#FFC83D";
const DARK = "#1a1a1a";
const LABEL = "#888";
const GREEN = "#2e7d32";

type PlanId = "free" | string;

type Plan = {
    id: string;
    name: string;
    price: string;
    period: string;
    productId: string | null;
    color: string;
    icon: string;
    gradient: string[];
    features: string[];
    disabled: string[];
    badge?: string;
    locked?: boolean;
};

const FREE_PLAN: Plan = {
    id: "free",
    name: "Gratuito",
    price: "R$0",
    period: "para sempre",
    productId: null,
    color: LABEL,
    icon: "person-outline",
    gradient: ["#9e9e9e", "#757575"],
    features: [
        "Registro de pesagens",
        "Até 20 slots de conferência",
    ],
    disabled: [
        "Anúncios no app",
        "Compartilhar via WhatsApp",
        "Exportar PDF",
    ],
};

const createPaidPlans = (packages: PurchasesPackage[]) => {
    const sortedPackages = [...packages].sort((a, b) => {
        const aIsPremium = a.product.identifier.includes('premium');
        const bIsPremium = b.product.identifier.includes('premium');
        if (aIsPremium && !bIsPremium) return -1;
        if (!aIsPremium && bIsPremium) return 1;
        return 0;
    })

    return sortedPackages.map((pkg, index) => {
        const isPremium = pkg.product.identifier.includes('premium');
        const isEnterprise = pkg.product.identifier.includes('enterprise');

        let period = "por ano";
        if (pkg.product.subscriptionPeriod) {
            const subPeriod = pkg.product.subscriptionPeriod;
            if (subPeriod === 'P1Y') period = "por ano";
            else if (subPeriod === 'P1M') period = "por mês";
            else if (subPeriod === 'P1W') period = "por semana";
        }
        return {
            id: pkg.product.identifier,
            name: isPremium ? "Pro" : "Empresa",
            price: pkg.product.priceString,
            period: period,
            productId: pkg.product.identifier,
            color: isPremium ? BLUE : GOLD,
            icon: isPremium ? "star" : "business",
            gradient: isPremium ? ["#509AE2", "#3a7bc8"] : ["#FFC83D", "#ffb300"],
            features: isPremium
                ? ["Tudo do Gratuito", "Sem anúncios", "Compartilhar via WhatsApp", "Exportar PDF"]
                : ["Tudo do Pro", "Logo da empresa no PDF", "Backup automático na nuvem", "Restaurar ao trocar de celular"],
            disabled: isPremium
                ? ["Logo da empresa no PDF", "Backup na nuvem"]
                : [],
            badge: isPremium ? "Popular" : undefined,
            locked: isEnterprise,
        };
    });
};

type Props = {
    visible: boolean;
    onClose: () => void;
    customerInfo?: CustomerInfo | null;
};

export function PaywallModal({ visible, onClose, customerInfo }: Props) {
    const [selected, setSelected] = useState<PlanId>("free");
    const [plans, setPlans] = useState([FREE_PLAN]);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setLoading(true);
        Purchases.getOfferings()
            .then(o => {
                const availablePackages = o.current?.availablePackages ?? [];
                const paidPlans = createPaidPlans(availablePackages);
                setPlans([FREE_PLAN, ...paidPlans]);
                setPackages(availablePackages);

                if (paidPlans.length > 0) {
                    setSelected(paidPlans[0].id);
                }
            })
            .catch(error => {
                console.error("RevenueCat Error:", error);
                setPlans([FREE_PLAN]);
            })
            .finally(() => setLoading(false));
    }, [visible]);

    const getPrice = (productId: string | null) => {
        if (!productId) return null;
        const pkg = packages.find(p => p.product.identifier === productId);
        return pkg?.product.priceString ?? null;
    };

    const getPlanById = (id: PlanId) => {
        return plans.find(p => p.id === id);
    };

    const handlePurchase = async () => {
        const plan = getPlanById(selected);
        if (!plan?.productId) return;

        const pkg = packages.find(p => p.product.identifier === plan.productId);
        if (!pkg) return;

        setPurchasing(true);
        try {
            await Purchases.purchasePackage(pkg);
            onClose();
        } catch (e: any) {
            if (!e.userCancelled) console.error(e);
        } finally {
            setPurchasing(false);
        }
    };

    const selectedPlan = getPlanById(selected) || FREE_PLAN;

    const activeSubscriptions = customerInfo?.activeSubscriptions ?? [];

    const getPlanTier = (planId: string) => {
        if (planId === 'free') return 0;
        if (planId.includes('premium')) return 1;
        return 2;
    };

    const currentTier = plans.reduce((max, p) => {
        if (p.productId && activeSubscriptions.includes(p.productId)) {
            return Math.max(max, getPlanTier(p.id));
        }
        return max;
    }, 0);

    const selectedTier = getPlanTier(selected);
    const isCurrentPlan = selectedPlan.productId
        ? activeSubscriptions.includes(selectedPlan.productId)
        : false;
    const isLowerPlan = selectedTier < currentTier && selectedTier > 0;
    const isUpgrade = selectedTier > currentTier && currentTier > 0;

    const ctaLabel = isCurrentPlan
        ? "Plano atual"
        : isLowerPlan
            ? "Plano inferior ao seu"
            : isUpgrade
                ? `Fazer upgrade para ${selectedPlan.name}`
                : `Assinar ${selectedPlan.name}`;

    const ctaDisabled = purchasing || loading || isCurrentPlan || isLowerPlan;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={["#509AE2", "#3a7bc8"]}
                    style={styles.headerGradient}
                >
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerTitle}>🚀 Calculadora Premium</Text>
                            <Text style={styles.headerSub}>Desbloqueie todo o potencial</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.planSelector}>
                        {plans.map(plan => (
                            <TouchableOpacity
                                key={plan.id}
                                style={[
                                    styles.planTab,
                                    selected === plan.id && {
                                        borderColor: plan.color,
                                        backgroundColor: plan.color + "15",
                                        transform: [{ scale: 1.02 }],
                                    },
                                ]}
                                onPress={() => setSelected(plan.id)}
                                activeOpacity={0.8}
                                disabled={plan.locked}
                            >
                                {plan.badge && (
                                    <View style={[styles.badge, { backgroundColor: plan.color }]}>
                                        <Text style={styles.badgeText}>{plan.badge}</Text>
                                    </View>
                                )}
                                {plan.locked && (
                                    <View style={styles.lockOverlay}>
                                        <Ionicons name="lock-closed" size={16} color="#999" />
                                    </View>
                                )}
                                <Ionicons
                                    name={plan.icon as any}
                                    size={24}
                                    color={selected === plan.id ? plan.color : LABEL}
                                />
                                <Text style={[
                                    styles.planTabName,
                                    selected === plan.id && { color: plan.color, fontWeight: "700" },
                                ]}>
                                    {plan.name}
                                </Text>
                                {plan.productId && (
                                    <Text style={[
                                        styles.planTabPrice,
                                        selected === plan.id && { color: plan.color },
                                    ]}>
                                        {loading ? "..." : getPrice(plan.productId) ?? plan.price}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={[styles.planDetail, { borderColor: selectedPlan.color }]}>
                        <LinearGradient
                            colors={selectedPlan.gradient as [string, string]}
                            style={styles.planDetailHeader}
                        >
                            <View style={[styles.planIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                                <Ionicons name={selectedPlan.icon as any} size={32} color="#fff" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 14 }}>
                                <Text style={styles.planDetailName}>
                                    {selectedPlan.name}
                                </Text>
                                {selectedPlan.productId ? (
                                    <Text style={styles.planDetailPrice}>
                                        {loading ? "Carregando..." : getPrice(selectedPlan.productId) ?? selectedPlan.price}
                                        <Text style={styles.planDetailPeriod}> / {selectedPlan.period}</Text>
                                    </Text>
                                ) : (
                                    <Text style={styles.planDetailPrice}>
                                        {selectedPlan.price}
                                        <Text style={styles.planDetailPeriod}> {selectedPlan.period}</Text>
                                    </Text>
                                )}
                            </View>
                        </LinearGradient>

                        <View style={styles.featuresList}>
                            {selectedPlan.features.map(f => (
                                <View key={f} style={styles.featureRow}>
                                    <View style={[styles.featureIcon, { backgroundColor: selectedPlan.color + "20" }]}>
                                        <Ionicons name="checkmark" size={16} color={selectedPlan.color} />
                                    </View>
                                    <Text style={styles.featureText}>{f}</Text>
                                </View>
                            ))}
                            {selectedPlan.disabled.map(f => (
                                <View key={f} style={styles.featureRow}>
                                    <View style={[styles.featureIcon, { backgroundColor: "#f5f5f5" }]}>
                                        <Ionicons name="close" size={16} color="#ccc" />
                                    </View>
                                    <Text style={[styles.featureText, { color: "#999" }]}>{f}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {selectedPlan.id !== "free" ? (
                        <>
                            {isCurrentPlan || isLowerPlan ? (
                                <TouchableOpacity
                                    style={[styles.ctaBtn, { backgroundColor: "#888" }]}
                                    onPress={() => Linking.openURL('https://play.google.com/store/account/subscriptions')}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="settings-outline" size={20} color="#fff" />
                                    <Text style={styles.ctaText}>
                                        {isCurrentPlan ? "Gerenciar assinatura" : "Fazer downgrade no Google Play"}
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.ctaBtn, { backgroundColor: selectedPlan.color }, purchasing && styles.ctaBtnDisabled]}
                                    onPress={handlePurchase}
                                    disabled={purchasing || loading}
                                    activeOpacity={0.85}
                                >
                                    {purchasing
                                        ? <ActivityIndicator color="#fff" />
                                        : <>
                                            <Ionicons name={isUpgrade ? "arrow-up-circle" : "flash"} size={20} color="#fff" />
                                            <Text style={styles.ctaText}>{ctaLabel}</Text>
                                        </>}
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.restoreBtn}
                                onPress={async () => {
                                    try { await Purchases.restorePurchases(); } catch { }
                                }}
                            >
                                <Text style={styles.restoreText}>Restaurar compra</Text>
                            </TouchableOpacity>

                            <Text style={styles.legal}>
                                🔒 Pagamento seguro via Google Play{"\n"}
                                Assinatura anual renovada automaticamente.{"\n"}
                                Cancele a qualquer momento.
                            </Text>
                        </>
                    ) : (
                        currentTier > 0 ? (
                            <TouchableOpacity
                                style={[styles.ctaBtn, { backgroundColor: "#888" }]}
                                onPress={() => Linking.openURL('https://play.google.com/store/account/subscriptions')}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="close-circle-outline" size={20} color="#fff" />
                                <Text style={styles.ctaText}>Cancelar assinatura no Google Play</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.freeBtn} onPress={onClose}>
                                <Ionicons name="arrow-forward" size={18} color={LABEL} />
                                <Text style={styles.freeBtnText}>Continuar com o plano Gratuito</Text>
                            </TouchableOpacity>
                        )
                    )}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8f9fa" },
    headerGradient: {
        paddingTop: Platform.OS === "ios" ? 16 : 20,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
    headerSub: { fontSize: 14, color: "rgba(255,255,255,0.9)", marginTop: 4 },
    closeBtn: {
        padding: 10,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    scroll: { padding: 20, paddingBottom: 40 },

    planSelector: { flexDirection: "row", gap: 12, marginBottom: 24 },
    planTab: {
        flex: 1, alignItems: "center", padding: 16,
        borderRadius: 16, borderWidth: 2, borderColor: "#e8e8e8",
        backgroundColor: "#fff",
        gap: 6,
        position: "relative",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    badge: {
        position: "absolute",
        top: -8,
        right: -8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 10, fontWeight: "700", color: "#fff",
    },
    planTabName: { fontSize: 14, fontWeight: "600", color: LABEL },
    planTabPrice: { fontSize: 13, color: LABEL, fontWeight: "700" },
    lockOverlay: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 15, padding: 5 },

    planDetail: { borderWidth: 2, borderRadius: 16, overflow: "hidden", marginBottom: 24 },
    planDetailHeader: { flexDirection: "row", alignItems: "center", padding: 20 },
    planIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
    planDetailName: { fontSize: 20, fontWeight: "700", color: "#fff" },
    planDetailPrice: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 4 },
    planDetailPeriod: { fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.9)" },

    featuresList: { padding: 20, backgroundColor: "#fff" },
    featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    featureIcon: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
    featureText: { fontSize: 15, color: "#333", flex: 1 },

    ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 16, marginBottom: 12 },
    ctaBtnDisabled: { opacity: 0.6 },
    ctaText: { color: "#fff", fontSize: 16, fontWeight: "700", marginLeft: 8 },

    restoreBtn: { alignItems: "center", paddingVertical: 12, marginBottom: 8 },
    restoreText: { fontSize: 14, color: LABEL, fontWeight: "600" },

    legal: { fontSize: 12, color: "#999", textAlign: "center", lineHeight: 18, marginTop: 8 },

    freeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderWidth: 1, borderColor: "#e8e8e8", borderRadius: 12 },
    freeBtnText: { fontSize: 16, fontWeight: "600", color: LABEL, marginLeft: 8 },
});
