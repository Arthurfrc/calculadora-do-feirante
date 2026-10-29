// src/modals/HistoryModal.tsx

import { useState, useMemo } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SalesHistory, SaleProductTotal } from "../types";
import { formatWeight, formatCurrency } from "../utils/formatters";

interface Props {
    visible: boolean;
    solMode?: boolean;
    onClose: () => void;
    history: SalesHistory;
}

type Tab = "products" | "days" | "weekdays";

const TABS: { id: Tab; label: string }[] = [
    { id: "products", label: "Produtos" },
    { id: "days", label: "Por dia" },
    { id: "weekdays", label: "Dia da semana" },
];
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // começa na segunda

const parseKey = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
};
const plural = (n: number) => `${n} ${n === 1 ? "venda" : "vendas"}`;
const pad = (n: number) => String(n).padStart(2, "0");
const dayLabel = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)} (${WEEKDAYS_SHORT[d.getDay()]})`;
const fmtQty = (type: string, qty: number) => (type === "kg" ? `${formatWeight(qty)} kg` : `${qty} un`);

type Detail =
    | { type: "product"; id: string }
    | { type: "day"; key: string }
    | { type: "weekday"; wd: number };

interface DetailRow { key: string; title: string; sub: string; value: number }
interface DetailView {
    title: string;
    subtitle: string;
    leftLabel: string;
    leftValue: string;
    revenue: number;
    sections: { heading: string; rows: DetailRow[] }[];
}

const productRows = (map: Record<string, SaleProductTotal>): DetailRow[] =>
    Object.entries(map)
        .map(([id, p]) => ({ key: id, title: p.name, sub: fmtQty(p.priceType, p.qty), value: p.revenue }))
        .sort((a, b) => b.value - a.value);

export function HistoryModal({ visible, solMode, onClose, history }: Props) {
    const [tab, setTab] = useState<Tab>("products");
    const [detail, setDetail] = useState<Detail | null>(null);

    const handleClose = () => { setDetail(null); onClose(); };
    const handleBack = () => (detail ? setDetail(null) : handleClose());

    const { totalRevenue, totalSales, products, days, weekdays } = useMemo(() => {
        let totalRevenue = 0;
        let totalSales = 0;
        const prod: Record<string, { name: string; priceType: string; qty: number; revenue: number }> = {};
        const weekdays = Array.from({ length: 7 }, () => ({ sales: 0, revenue: 0 }));
        const days = Object.entries(history).sort(([a], [b]) => b.localeCompare(a)); // mais recente primeiro
        for (const [key, day] of days) {
            totalRevenue += day.revenue;
            totalSales += day.sales;
            const wd = parseKey(key).getDay();
            weekdays[wd].sales += day.sales;
            weekdays[wd].revenue += day.revenue;
            for (const [id, p] of Object.entries(day.products)) {
                const cur = prod[id] ?? { name: p.name, priceType: p.priceType, qty: 0, revenue: 0 };
                cur.qty += p.qty;
                cur.revenue += p.revenue;
                prod[id] = cur;
            }
        }
        const products = Object.entries(prod).map(([id, p]) => ({ id, ...p })).sort((a, b) => b.revenue - a.revenue);
        return { totalRevenue, totalSales, products, days, weekdays };
    }, [history]);

    const detailView: DetailView | null = (() => {
        if (!detail) return null;

        if (detail.type === "day") {
            const day = history[detail.key];
            if (!day) return null;
            const d = parseKey(detail.key);
            return {
                title: `${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${WEEKDAYS[d.getDay()]}`,
                subtitle: "Vendas do dia",
                leftLabel: "Vendas",
                leftValue: String(day.sales),
                revenue: day.revenue,
                sections: [{ heading: "Produtos", rows: productRows(day.products) }],
            };
        }

        if (detail.type === "weekday") {
            const agg: Record<string, SaleProductTotal> = {};
            let sales = 0;
            let revenue = 0;
            for (const [key, day] of days) {
                if (parseKey(key).getDay() !== detail.wd) continue;
                sales += day.sales;
                revenue += day.revenue;
                for (const [id, p] of Object.entries(day.products)) {
                    const cur = agg[id] ?? { ...p, qty: 0, revenue: 0 };
                    cur.qty += p.qty;
                    cur.revenue += p.revenue;
                    agg[id] = cur;
                }
            }
            return {
                title: WEEKDAYS[detail.wd],
                subtitle: "Soma dos últimos 30 dias",
                leftLabel: "Vendas",
                leftValue: String(sales),
                revenue,
                sections: [{ heading: "Produtos", rows: productRows(agg) }],
            };
        }

        const prod = products.find((p) => p.id === detail.id);
        if (!prod) return null;
        const byWeekday: Record<number, { qty: number; revenue: number }> = {};
        const dayRows: DetailRow[] = [];
        for (const [key, day] of days) {
            const p = day.products[detail.id];
            if (!p) continue;
            const d = parseKey(key);
            dayRows.push({ key, title: dayLabel(d), sub: fmtQty(p.priceType, p.qty), value: p.revenue });
            const w = byWeekday[d.getDay()] ?? { qty: 0, revenue: 0 };
            w.qty += p.qty;
            w.revenue += p.revenue;
            byWeekday[d.getDay()] = w;
        }
        const weekdayRows: DetailRow[] = WEEK_ORDER.filter((wd) => byWeekday[wd]).map((wd) => ({
            key: String(wd),
            title: WEEKDAYS[wd],
            sub: fmtQty(prod.priceType, byWeekday[wd].qty),
            value: byWeekday[wd].revenue,
        }));
        return {
            title: prod.name,
            subtitle: "Últimos 30 dias",
            leftLabel: "Vendido",
            leftValue: fmtQty(prod.priceType, prod.qty),
            revenue: prod.revenue,
            sections: [
                { heading: "Por dia", rows: dayRows },
                { heading: "Por dia da semana", rows: weekdayRows },
            ],
        };
    })();

    const row = (key: string, title: string, sub: string, value: number, onPress?: () => void) => {
        const content = (
            <>
                <View style={styles.rowInfo}>
                    <Text style={[styles.rowTitle, solMode && sol.rowTitle]}>{title}</Text>
                    <Text style={[styles.rowSub, solMode && sol.rowSub]}>{sub}</Text>
                </View>
                <Text style={[styles.rowValue, solMode && sol.rowValue]}>{formatCurrency(value)}</Text>
                {onPress && <Ionicons name="chevron-forward" size={18} color={solMode ? "#ddd" : "#bbb"} style={styles.rowChevron} />}
            </>
        );
        return onPress ? (
            <TouchableOpacity key={key} style={[styles.row, solMode && sol.row]} onPress={onPress} activeOpacity={0.7}>
                {content}
            </TouchableOpacity>
        ) : (
            <View key={key} style={[styles.row, solMode && sol.row]}>{content}</View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={handleBack}>
            <SafeAreaView style={[styles.container, solMode && sol.container]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="arrow-back" size={22} color={solMode ? "#fff" : "#555"} />
                        <Text style={[styles.backButtonText, solMode && sol.backButtonText]}>{detailView ? "Histórico" : "Voltar"}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.content}>
                    {detailView ? (
                        <>
                            <Text style={[styles.modalTitle, solMode && sol.modalTitle]}>{detailView.title}</Text>
                            <Text style={[styles.subtitle, solMode && sol.subtitle]}>{detailView.subtitle}</Text>

                            <View style={[styles.summary, solMode && sol.summary]}>
                                <View style={styles.summaryItem}>
                                    <Text style={[styles.summaryLabel, solMode && sol.summaryLabel]}>{detailView.leftLabel}</Text>
                                    <Text style={[styles.summaryValue, solMode && sol.summaryValue]}>{detailView.leftValue}</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text style={[styles.summaryLabel, solMode && sol.summaryLabel]}>Faturado</Text>
                                    <Text style={[styles.summaryValue, styles.summaryHighlight, solMode && sol.summaryHighlight]}>
                                        {formatCurrency(detailView.revenue)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.listContainer}>
                                <ScrollView style={styles.list}>
                                    {detailView.sections.map((s) => (
                                        <View key={s.heading}>
                                            <Text style={[styles.sectionHeading, solMode && sol.sectionHeading]}>{s.heading.toUpperCase()}</Text>
                                            {s.rows.map((r) => row(r.key, r.title, r.sub, r.value))}
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        </>
                    ) : (
                        <>
                            <Text style={[styles.modalTitle, solMode && sol.modalTitle]}>Histórico de Vendas</Text>
                            <Text style={[styles.subtitle, solMode && sol.subtitle]}>Últimos 30 dias</Text>

                            <View style={[styles.summary, solMode && sol.summary]}>
                                <View style={styles.summaryItem}>
                                    <Text style={[styles.summaryLabel, solMode && sol.summaryLabel]}>Vendas</Text>
                                    <Text style={[styles.summaryValue, solMode && sol.summaryValue]}>{totalSales}</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text style={[styles.summaryLabel, solMode && sol.summaryLabel]}>Faturado</Text>
                                    <Text style={[styles.summaryValue, styles.summaryHighlight, solMode && sol.summaryHighlight]}>
                                        {formatCurrency(totalRevenue)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.tabs}>
                                {TABS.map((t) => (
                                    <TouchableOpacity
                                        key={t.id}
                                        style={[styles.tab, solMode && sol.tab, tab === t.id && styles.tabActive]}
                                        onPress={() => setTab(t.id)}
                                    >
                                        <Text style={[styles.tabText, solMode && sol.tabText, tab === t.id && styles.tabTextActive]}>
                                            {t.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.listContainer}>
                                <ScrollView style={styles.list}>
                                    {totalSales === 0 ? (
                                        <Text style={[styles.emptyText, solMode && sol.emptyText]}>Nenhuma venda registrada ainda.</Text>
                                    ) : tab === "products" ? (
                                        products.map((p) =>
                                            row(p.id, p.name, fmtQty(p.priceType, p.qty), p.revenue, () => setDetail({ type: "product", id: p.id }))
                                        )
                                    ) : tab === "days" ? (
                                        days.map(([key, day]) =>
                                            row(key, dayLabel(parseKey(key)), plural(day.sales), day.revenue, () => setDetail({ type: "day", key }))
                                        )
                                    ) : (
                                        WEEK_ORDER.map((wd) =>
                                            row(String(wd), WEEKDAYS[wd], plural(weekdays[wd].sales), weekdays[wd].revenue, () => setDetail({ type: "weekday", wd }))
                                        ))}
                                </ScrollView>
                            </View>
                        </>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const LABEL_COLOR = "#888";

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
    backButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start" },
    backButtonText: { fontSize: 14, color: "#555", marginLeft: 4 },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
    modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
    subtitle: { fontSize: 13, color: LABEL_COLOR, marginTop: 2, marginBottom: 16 },
    summary: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#f5f5f5", borderRadius: 12, padding: 16, marginBottom: 16 },
    summaryItem: { alignItems: "center" },
    summaryLabel: { fontSize: 11, color: LABEL_COLOR, fontWeight: "600", marginBottom: 4 },
    summaryValue: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
    summaryHighlight: { fontSize: 20, color: "#2e7d32" },
    tabs: { flexDirection: "row", gap: 8, marginBottom: 8 },
    tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fafafa" },
    tabActive: { backgroundColor: "#2196f3", borderColor: "#2196f3" },
    tabText: { fontSize: 13, fontWeight: "600", color: "#666" },
    tabTextActive: { color: "#fff" },
    listContainer: { flex: 1 },
    list: { flex: 1 },
    emptyText: { textAlign: "center", color: LABEL_COLOR, marginTop: 40, fontSize: 15 },
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
    rowInfo: { flex: 1 },
    rowTitle: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
    rowSub: { fontSize: 13, color: "#666", marginTop: 2 },
    rowValue: { fontSize: 15, fontWeight: "700", color: "#2e7d32" },
    rowChevron: { marginLeft: 8 },
    sectionHeading: { fontSize: 12, fontWeight: "600", color: LABEL_COLOR, letterSpacing: 0.4, marginTop: 16, marginBottom: 4 },
});

// ─── Modo sol (SÓ cores) ───
const sol = StyleSheet.create({
    container: { backgroundColor: "#000" },
    backButtonText: { color: "#fff" },
    modalTitle: { color: "#fff" },
    subtitle: { color: "#ddd" },
    summary: { backgroundColor: "#222" },
    summaryLabel: { color: "#ddd" },
    summaryValue: { color: "#fff" },
    summaryHighlight: { color: "#ff0" },
    tab: { backgroundColor: "#222", borderColor: "#555" },
    tabText: { color: "#ddd" },
    emptyText: { color: "#ddd" },
    row: { borderBottomColor: "#444" },
    rowTitle: { color: "#fff" },
    rowSub: { color: "#ddd" },
    rowValue: { color: "#ff0" },
    sectionHeading: { color: "#ddd" },
});