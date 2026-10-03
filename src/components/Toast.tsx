// src/components/Toast.tsx

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function Toast({ message, visible }: { message: string; visible: boolean }) {
    const opacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 250, useNativeDriver: true }).start();
    }, [visible]);
    return (
        <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
            <Ionicons name="checkmark-circle" size={20} color="#00ff15" style={{ marginRight: 8 }} />
            <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    toast: {
        position: "absolute", bottom: 90, alignSelf: "center",
        backgroundColor: "#323232", borderRadius: 24,
        paddingHorizontal: 18, paddingVertical: 10,
        flexDirection: "row", alignItems: "center",
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2, shadowRadius: 6, elevation: 8,
    },
    toastText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
