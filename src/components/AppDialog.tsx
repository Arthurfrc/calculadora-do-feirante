// src/components/AppDialog.tsx

import React, { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type DialogVariant = "alert" | "confirm" | "destructive" | "premium";

interface DialogConfig {
    title: string;
    message: string;
    variant?: DialogVariant;
    confirmLabel?: string;
    cancelLabel?: string;
    middleLabel?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    onMiddleAction?: () => void;
}

interface Props {
    config: DialogConfig | null;
    show: (config: DialogConfig) => void;
    dismiss: () => void;
    solMode?: boolean;
}

export function useAppDialog() {
    const [config, setConfig] = useState<DialogConfig | null>(null);

    const show = (newConfig: DialogConfig) => setConfig(newConfig);
    const dismiss = () => setConfig(null);

    return { config, show, dismiss };
}

export function AppDialog({ config, show, dismiss, solMode }: Props) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(!!config);
    }, [config]);

    if (!config) return null;

    const handleConfirm = () => {
        config.onConfirm?.();
        dismiss();
    };

    const handleCancel = () => {
        config.onCancel?.();
        dismiss();
    };

    const handleMiddle = () => {
        config.onMiddleAction?.();
        dismiss();
    };

    const getIcon = () => {
        switch (config.variant) {
            case "destructive": return <Ionicons name="warning" size={32} color="#e53935" />;
            case "premium": return <Ionicons name="star" size={32} color="#FFC83D" />;
            case "confirm": return <Ionicons name="help-circle" size={32} color="#2196f3" />;
            default: return <Ionicons name="information-circle" size={32} color="#2196f3" />;
        }
    };

    const getConfirmColor = () => {
        switch (config.variant) {
            case "destructive": return "#e53935";
            case "premium": return "#FFC83D";
            default: return "#2196f3";
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleCancel}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={handleCancel}
            >
                <TouchableOpacity activeOpacity={1} style={[styles.dialog, solMode && sol.dialog]}>
                    <View style={styles.iconContainer}>
                        {getIcon()}
                    </View>

                    <Text style={[styles.title, solMode && sol.title]}>{config.title}</Text>
                    <Text style={[styles.message, solMode && sol.message]}>{config.message}</Text>

                    <View style={styles.buttonContainer}>
                        {config.middleLabel && (
                            <TouchableOpacity
                                style={[styles.button, styles.middleButton]}
                                onPress={handleMiddle}
                            >
                                <Text style={styles.middleButtonText}>{config.middleLabel}</Text>
                            </TouchableOpacity>
                        )}

                        {config.cancelLabel && (
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton, solMode && sol.cancelButton]}
                                onPress={handleCancel}
                            >
                                <Text style={[styles.cancelButtonText, solMode && sol.cancelButtonText]}>{config.cancelLabel}</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.button, styles.confirmButton, { backgroundColor: getConfirmColor() }]}
                            onPress={handleConfirm}
                        >
                            <Text style={styles.confirmButtonText}>{config.confirmLabel || "OK"}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    dialog: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        width: Math.min(Dimensions.get("window").width - 40, 340),
        alignItems: "center",
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1a1a1a",
        textAlign: "center",
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 20,
    },
    buttonContainer: {
        width: "100%",
        gap: 8,
    },
    button: {
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    confirmButton: {
        backgroundColor: "#2196f3",
    },
    confirmButtonText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    cancelButton: {
        backgroundColor: "#f5f5f5",
    },
    cancelButtonText: {
        color: "#666",
        fontSize: 15,
        fontWeight: "600",
    },
    middleButton: {
        backgroundColor: "#509AE2",
    },
    middleButtonText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
});

// ─── Modo sol (SÓ cores) ───
const sol = StyleSheet.create({
    dialog: { backgroundColor: "#000", borderWidth: 1, borderColor: "#ff0" },
    title: { color: "#fff" },
    message: { color: "#ddd" },
    cancelButton: { backgroundColor: "#333" },
    cancelButtonText: { color: "#fff" },
});
