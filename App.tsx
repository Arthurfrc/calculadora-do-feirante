//App.tsx

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, StatusBar, KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from 'expo-constants';
// import Purchases from 'react-native-purchases';
// import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import * as SplashScreen from 'expo-splash-screen';
// import * as Application from 'expo-application';

import { AppDialog, useAppDialog } from "./src/components/AppDialog";
import { Conference, Product } from "./src/types";
import { formatWeight, formatCurrency, formatDate, generateConferenceName, getDisplayName, formatWeightInput, parseWeightInput } from "./src/utils/formatters";
import { Toast } from "./src/components/Toast";
import { useSlots } from "./src/hooks/useSlots";
import { useProducts } from "./src/hooks/useProducts";
import { SaveModal } from "./src/modals/SaveModal";
import { LoadModal } from "./src/modals/LoadModal";
import { ShareModal } from "./src/modals/ShareModal";
import { PaywallModal } from "./src/modals/PaywallModal";
import { ProductsModal } from "./src/modals/ProductsModal";
import { FinalizeModal } from "./src/modals/FinalizeModal";
import { shareViaWhatsApp } from "./src/services/whatsappService";
import { generateAndSharePDF } from "./src/services/printService";
// import { usePurchases } from "./src/hooks/usePurchases";

// ─── Component ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 80; // Aumentado para 2 linhas por item
const HEADER_HEIGHT = 42;
const MAX_ITENS_FREE = parseInt(process.env.EXPO_PUBLIC_MAX_ITENS_FREE ?? "15");
const MAX_ITENS_PREMIUM = parseInt(process.env.EXPO_PUBLIC_MAX_ITENS_PREMIUM ?? "999");

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function App() {
  const [solMode, setSolMode] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const afterSaveRef = useRef<(() => void) | null>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [showProductsModal, setShowProductsModal] = useState(false);

  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [splashReady, setSplashReady] = useState(false);

  // const { isPremium, customerInfo, loadCustomerInfo } = usePurchases();
  const isPremium = false; // Temporariamente desativado para desenvolvimento
  const customerInfo = null;
  const loadCustomerInfo = () => {};

  const { products, addProduct, updateProduct, deleteProduct } = useProducts();

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Dialog ────────────────────────────────────────────────────────────────
  const { config: dialogConfig, show: showDialog, dismiss: dismissDialog } = useAppDialog();

  // ── Computed ──────────────────────────────────────────────────────────────

  const activeProducts = products.filter(p => quantities[p.id] && quantities[p.id] > 0);
  // const totalQty = activeProducts.reduce((sum, p) => sum + (quantities[p.id] || 0), 0);
  const totalQty = activeProducts.length;
  const totalWeight = activeProducts.reduce((sum, p) => {
    const qty = quantities[p.id] || 0;
    return sum + (p.priceType === 'kg' ? qty : 0);
  }, 0);
  const totalValue = activeProducts.reduce((sum, p) => {
    const qty = quantities[p.id] || 0;
    return sum + (qty * p.price);
  }, 0);

  const MAX_SLOTS_FREE = parseInt(process.env.EXPO_PUBLIC_MAX_SLOTS_FREE ?? "20");
  const MAX_SLOTS_PREMIUM = parseInt(process.env.EXPO_PUBLIC_MAX_SLOTS_PREMIUM ?? "999");
  const maxSlots = isPremium ? MAX_SLOTS_PREMIUM : MAX_SLOTS_FREE;

  const MAX_ITENS_FREE = parseInt(process.env.EXPO_PUBLIC_MAX_ITENS_FREE ?? "50");

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  };

  // ── Storage ───────────────────────────────────────────────────────────────

  const { slots, setSlots, currentSlot, readSlots, setCurrentSlot, writeSlots } = useSlots(maxSlots);
  useEffect(() => { readSlots().then(setSlots); }, []);

  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    setTimeout(async () => {
      setSplashReady(true);
      await SplashScreen.hideAsync().catch(() => { });
    }, 1000);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleQuickSave = () => {
    const firstEmpty = slots.findIndex(s => s === null);
    const targetIndex = firstEmpty !== -1 ? firstEmpty : 0;
    handleSaveToSlot(targetIndex);
  };

  const handleQuickSaveFromLoad = useCallback(() => {
    if (currentSlot !== null) {
      afterSaveRef.current = () => {
        readSlots().then(setSlots);
      };
      handleSaveToSlot(currentSlot - 1);
    } else {
      afterSaveRef.current = () => {
        setTimeout(() => {
          readSlots().then(s => { setSlots(s); setShowLoadModal(true); });
        }, 400);
      };
      setShowLoadModal(false);
      readSlots().then(setSlots);
      setShowSaveModal(true);
    }
  }, [currentSlot, slots, quantities]);

  const handleQuickSaveFromShare = useCallback(() => {
    if (currentSlot !== null) {
      // ShareModal fica aberta — só precisa atualizar os slots após salvar
      afterSaveRef.current = () => {
        readSlots().then(setSlots);
      };
      handleSaveToSlot(currentSlot - 1);
    } else {
      // Fecha Share, abre Save, e após salvar reabre Share com delay
      afterSaveRef.current = () => {
        setTimeout(() => {
          readSlots().then(s => { setSlots(s); setShowShareModal(true); });
        }, 500); // aguarda animação do SaveModal fechar
      };
      setShowShareModal(false);
      readSlots().then(setSlots);
      setShowSaveModal(true);
    }
  }, [currentSlot, slots]);

  const handleClearAll = useCallback(() => {
    showDialog({
      title: "Limpar pesagem?",
      message: "Todos os itens serão removidos. Essa ação não pode ser desfeita.",
      variant: "destructive",
      confirmLabel: "Limpar",
      onConfirm: () => {
        setQuantities({});
        setCustomTitle("");
      },
    });
  }, [showDialog]);

  const handleQuantityChange = (productId: string, value: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setQuantityInputs(prev => ({ ...prev, [productId]: value }));

    if (value === "" || value === ".") {
      setQuantities(prev => ({ ...prev, [productId]: 0 }));
      return;
    }

    let qty: number;
    if (product.priceType === 'kg') {
      qty = parseWeightInput(value);
    } else {
      qty = parseFloat(value.replace(",", "."));
    }

    if (!isNaN(qty) && qty >= 0) {
      setQuantities(prev => ({ ...prev, [productId]: qty }));
    }
  };

  const handleZeroAll = useCallback(() => {
    showDialog({
      title: "Zerar quantidades?",
      message: "Todas as quantidades serão zeradas. Essa ação não pode ser desfeita.",
      variant: "destructive",
      confirmLabel: "Zerar",
      cancelLabel: "Cancelar",
      onConfirm: () => {
        setQuantities({});
        setQuantityInputs({});
      },
    });
  }, [showDialog]);

  const handleOpenSaveModal = useCallback(() => {
    if (Object.keys(quantities).length === 0 || Object.values(quantities).every(q => q === 0)) {
      showDialog({
        title: "Nada para salvar",
        message: "Adicione pelo menos uma quantidade antes de salvar.",
        variant: "alert",
      });
      return;
    }

    if (customTitle.trim()) {
      if (currentSlot !== null) {
        handleSaveToSlot(currentSlot - 1);
        return;
      }

      const firstEmpty = slots.findIndex(slot => slot === null);

      if (firstEmpty !== -1) {
        handleSaveToSlot(firstEmpty);
        return;
      }

      showDialog({
        title: "Limite atingido",
        message: "Todos os slots disponíveis já estão ocupados.",
        variant: "premium",
        confirmLabel: "Ver Premium",
        cancelLabel: "Agora não",
      });

      return;
    }

    setShowSaveModal(true);
  }, [quantities, customTitle, currentSlot, slots]);

  const handleNewList = useCallback(() => {
    showDialog({
      title: "Nova pesagem?",
      message: "A pesagem atual será descartada. Itens não salvos serão perdidos.",
      variant: "confirm",
      cancelLabel: "Cancelar",
      middleLabel: "Salvar",
      confirmLabel: "Nova pesagem",
      onMiddleAction: () => {
        handleOpenSaveModal();
      },
      onConfirm: () => {
        setQuantities({});
        setCustomTitle("");
        setCurrentSlot(null);
      },
    });
  }, [showDialog, handleOpenSaveModal, quantities]);

  const handleOpenLoadModal = useCallback(() => {
    readSlots().then((s) => { setSlots(s); setShowLoadModal(true); });
  }, []);

  const handleSaveToSlot = (slotIndex: number) => {
    const existing = slots[slotIndex];
    const doSave = async () => {
      const updated = [...slots];
      updated[slotIndex] = {
        id: Date.now().toString(),
        name: generateConferenceName(),
        customTitle: customTitle.trim() || undefined,
        date: new Date().toISOString(),
        quantities,
        createdAt: Date.now(),
      };
      await writeSlots(updated);
      setCurrentSlot(slotIndex + 1);
      setShowSaveModal(false);
      showToast(`Salvo no Slot ${slotIndex + 1}!`);
      afterSaveRef.current?.();
      afterSaveRef.current = null;
    };

    if (existing) {
      showDialog({
        title: `Sobrescrever Slot ${slotIndex + 1}?`,
        message: `"${getDisplayName(existing)}"\n${formatDate(existing.date)}\n\nOs dados atuais serão substituídos.`,
        variant: "destructive",
        confirmLabel: "Substituir",
        onConfirm: doSave,
      });
    } else {
      doSave();
    }
  };

  const handleLoadSlot = (slotIndex: number) => {
    const conf = slots[slotIndex];
    if (!conf) return;
    setQuantities(conf.quantities || {});
    setCustomTitle(conf.customTitle || "");
    setCurrentSlot(slotIndex + 1);
    setShowLoadModal(false);
    showToast(`Slot ${slotIndex + 1} carregado!`);
  };

  const handleDeleteSlot = (slotIndex: number) => {
    showDialog({
      title: "Excluir pesagem?",
      message: `"${getDisplayName(slots[slotIndex]!)}" será removida permanentemente.`,
      variant: "destructive",
      confirmLabel: "Excluir",
      onConfirm: async () => {
        const updated = [...slots];
        updated[slotIndex] = null;
        await writeSlots(updated);
        if (currentSlot === slotIndex + 1) setCurrentSlot(null);
      },
    });
  };

  const handleOpenShareModal = useCallback(() => {
    readSlots().then((s) => { setSlots(s); setShowShareModal(true); });
  }, []);

  const handleShareWhatsApp = useCallback(async (conference: Conference, phone: string) => {
    try {
      await shareViaWhatsApp(conference, products, phone);
      showToast("Enviando para WhatsApp...");
    } catch (error) {
      showDialog({
        title: "Erro",
        message: "Não foi possível abrir o WhatsApp. Verifique se o app está instalado.",
        variant: "alert",
      });
    }
  }, [products]);

  const handleSharePDF = useCallback(async (conference: Conference) => {
    try {
      await generateAndSharePDF(conference, products);
      showToast("PDF gerado com sucesso!");
    } catch (error) {
      showDialog({
        title: "Erro",
        message: "Não foi possível gerar o PDF.",
        variant: "alert",
      });
    }
  }, [products]);

  const handleShowIds = async () => {
    setShowMenu(false);

    try {
      // const androidID = await Application.getAndroidId();
      // const customerInfo = await Purchases.getCustomerInfo();

      // const revenueID = customerInfo.originalAppUserId;

      // const activeEntitlements = Object.keys(
      //   customerInfo.entitlements.active
      // );

      // const activeSubscriptions = customerInfo.activeSubscriptions;

      showDialog({
        title: "Diagnóstico RevenueCat",
        message:
          "RevenueCat temporariamente desativado para desenvolvimento.",

        variant: "alert",
        confirmLabel: "OK",
      });

    } catch (error) {
      console.error(error);

      showDialog({
        title: "Erro",
        message: "Não foi possível carregar os dados do RevenueCat.",
        variant: "alert",
        confirmLabel: "OK",
      });
    }
  };

  if (!splashReady) return null;
  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safeArea, solMode && sol.bg]}>
        <StatusBar barStyle={solMode ? "light-content" : "dark-content"} backgroundColor={solMode ? "#000" : "#fff"} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* ── Menu ── */}
          {showMenu && (
            <>
              <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)} />
              <View style={[styles.menuDropdown, solMode && sol.menu]}>
                {([
                  { label: "Nova Pesagem", icon: "add-circle", color: "#25D366", onPress: () => { handleNewList(); setShowMenu(false); } },
                  { label: "Salvar", icon: "save-sharp", color: "#509AE2", onPress: () => { handleOpenSaveModal(); setShowMenu(false); } },
                  { label: "Carregar", icon: "folder-open", color: "#333", onPress: () => { handleOpenLoadModal(); setShowMenu(false); } },
                  {
                    label: "Compartilhar", icon: "arrow-redo", color: "#333", onPress: () => {
                      if (isPremium) {
                        handleOpenShareModal();
                        setShowMenu(false);
                      } else {
                        setShowMenu(false);
                        showDialog({
                          title: "Funcionalidade Premium",
                          message: "Essa funcionalidade está disponível apenas para assinantes Premium.",
                          variant: "premium",
                          confirmLabel: "Ver Premium",
                          cancelLabel: "Entendido",
                          onConfirm: () => setShowPaywallModal(true)
                        });
                      }
                    }
                  },
                  { label: "Produtos", icon: "pricetag", color: "#FF9800", onPress: () => { setShowMenu(false); setShowProductsModal(true) } },
                  { label: "Zerar Quantidades", icon: "refresh", color: "#e53935", onPress: () => { handleZeroAll(); setShowMenu(false); } },
                  { label: "Meu ID", icon: "phone-portrait", color: "#888", onPress: handleShowIds },
                  { label: "Premium", icon: "star", color: "#FFC83D", onPress: () => { setShowMenu(false); setShowPaywallModal(true) } },
                ] as const).map((item, i, arr) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.menuItem, solMode && sol.menuItem, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={item.onPress}
                  >
                    <Ionicons name={item.icon as any} size={20} color={solMode && (item.color === "#333" || item.color === "#888") ? "#fff" : item.color} />
                    <Text style={[styles.menuItemText, { color: solMode && (item.color === "#333" || item.color === "#888") ? "#fff" : item.color }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── Header ── */}
          <View style={[styles.fixedTop, solMode && sol.bg]}>
            {/* Título do app + botão menu */}
            <View style={styles.titleContainer}>
              <Text style={[styles.title, solMode && sol.text]}>{Constants.expoConfig?.extra?.APP_NAME || 'Calculadora do Feirante'}</Text>
              <TouchableOpacity style={[styles.menuButton, solMode && sol.btn]} onPress={() => setShowMenu(!showMenu)}>
                <Ionicons name="menu" size={26} color={solMode ? "#fff" : "#555"} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuButton, solMode && sol.btn, { marginLeft: 8 }]} onPress={() => setSolMode(v => !v)}>
                <Ionicons name={solMode ? "sunny" : "moon"} size={26} color={solMode ? "#ff0" : "#555"} />
              </TouchableOpacity>
            </View>

            {/* Campo de título personalizado — linha própria, largura total */}
            <View style={styles.titleInputRow}>
              <TextInput
                style={[styles.customTitleInput, solMode && sol.input]}
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder="Título da pesagem (opcional)"
                placeholderTextColor="#bbb"
                maxLength={50}
                returnKeyType="done"
              />
            </View>

            {/* Estatísticas */}
            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <Text style={[styles.statLabel, solMode && sol.text]}>PRODUTOS</Text>
                <Text style={[styles.statValue, solMode && sol.text]}>{totalQty}</Text>
              </View>
              <View style={[styles.statBlock, styles.statBlockRight]}>
                <Text style={[styles.statLabel, solMode && sol.text]}>VALOR TOTAL</Text>
                <Text style={[styles.statValue, solMode && sol.yellow]}>{formatCurrency(totalValue)}</Text>
              </View>
            </View>

            <View style={[styles.divider, solMode && sol.divider]} />
          </View>

          {activeProducts.length > 0 && !isPremium && (
            <View style={[styles.counterRow, solMode && sol.counterRow]}>
              <View style={styles.counterBarWrap}>
                <View style={[styles.counterFill, {
                  width: `${Math.min((activeProducts.length / MAX_ITENS_FREE) * 100, 100)}%` as any,
                  backgroundColor:
                    activeProducts.length >= MAX_ITENS_FREE ? "#e53935"
                      : activeProducts.length >= MAX_ITENS_FREE * 0.8 ? "#ff9800"
                        : "#509AE2",
                }]} />
              </View>
              <Text style={[
                styles.counterText,
                solMode && sol.text,
                activeProducts.length >= MAX_ITENS_FREE * 0.8 && { color: "#ff9800" },
                activeProducts.length >= MAX_ITENS_FREE && { color: "#e53935", fontWeight: "700" },
              ]}>
                {activeProducts.length}/{MAX_ITENS_FREE} itens
              </Text>
            </View>
          )}
          {/* ── List ── */}
          <ScrollView
            ref={scrollViewRef}
            style={[styles.scrollView, solMode && sol.bg]}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {products.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum produto cadastrado. Cadastre no menu "Produtos".</Text>
            ) : (
              <>
                {sortedProducts.map((product) => {
                  const qty = quantities[product.id] || 0;
                  const inputText = quantityInputs[product.id] || "";
                  const subtotal = qty * product.price;
                  const isActive = qty > 0;
                  return (
                    <View key={product.id} style={[styles.itemRow, isActive && styles.itemRowActive, solMode && sol.itemRow, solMode && isActive && sol.itemRowActive]}>
                      <View style={styles.itemMain}>
                        <Text style={[styles.itemName, solMode && sol.text]}>{product.name}</Text>
                        <View style={styles.itemDetails}>
                          <Text style={[styles.itemDetail, solMode && sol.detail]}>
                            R$ {product.price.toFixed(2)}/{product.priceType === 'kg' ? 'kg' : 'un'}
                          </Text>
                          {isActive && (
                            <>
                              <Text style={[styles.itemDetail, styles.itemSubtotal, solMode && sol.yellow]}>
                                {formatCurrency(subtotal)}
                              </Text>
                              {product.priceType === 'kg' && (
                                <Text style={[styles.itemDetail, solMode && sol.detail]}>
                                  Peso: {formatWeight(qty)} kg
                                </Text>
                              )}
                            </>
                          )}
                        </View>
                      </View>
                      <View style={styles.itemActions}>
                        <TextInput
                          style={[styles.qtyInputList, solMode && sol.input]}
                          value={inputText}
                          onChangeText={(text) => {
                            const formatted = product.priceType === 'kg' ? formatWeightInput(text) : text;
                            handleQuantityChange(product.id, formatted);
                          }}
                          keyboardType="numeric"
                          returnKeyType="done"
                          placeholder="0"
                          placeholderTextColor="#ccc"
                        />
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>

          {/* ── Bottom bar ── */}
          <View style={[styles.bottomBar, solMode && sol.bottomBar]}>
            <TouchableOpacity
              style={[styles.zeroButton, solMode && sol.zeroButton]}
              onPress={handleZeroAll}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={20} color="#e53935" />
              <Text style={[styles.zeroButtonText, solMode && sol.zeroText]}>Zerar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.finalizeButton, solMode && sol.finalize]}
              onPress={() => setShowFinalizeModal(true)}
              activeOpacity={0.85}
              disabled={activeProducts.length === 0}
            >
              <Ionicons name="checkmark-circle" size={20} color={solMode ? "#000" : "#fff"} />
              <Text style={[styles.finalizeButtonText, solMode && sol.finalizeText]}>Finalizar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <Toast message={toastMessage} visible={toastVisible} />
        {/* ════════════ BANNER DE RODAPÉ ════════════ */}
        {/* {!isPremium && (
          <View style={styles.bannerContainer}>
            <BannerAd
              unitId={__DEV__ ? TestIds.BANNER : process.env.EXPO_PUBLIC_ID_AD}
              size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{ requestNonPersonalizedAdsOnly: true }}
              onAdFailedToLoad={(error) => console.log("AdMob Error: ", error)}
            />
          </View>
        )} */}
      </SafeAreaView>

      {/* ════════════ MODAL: COMPARTILHAR ════════════ */}
      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        slots={slots}
        currentSlot={currentSlot}
        currentQuantities={quantities}
        currentCustomTitle={customTitle}
        products={products}
        onShareWhatsApp={handleShareWhatsApp}
        onSharePDF={handleSharePDF}
        onQuickSave={handleQuickSaveFromShare}
        readSlots={readSlots}
        setSlots={setSlots}
        isPremium={isPremium}
      />

      {/* ═════════════════════════════════════════ */}
      {/* ════════════ MODAL: SALVAR ════════════ */}
      <SaveModal
        visible={showSaveModal}
        solMode={solMode}
        onClose={() => setShowSaveModal(false)}
        customTitle={customTitle}
        onChangeTitle={setCustomTitle}
        onQuickSave={handleQuickSave}
      />

      {/* ════════════ MODAL: CARREGAR ════════════ */}
      <LoadModal
        visible={showLoadModal}
        solMode={solMode}
        onClose={() => setShowLoadModal(false)}
        slots={slots}
        currentSlot={currentSlot}
        currentQuantities={quantities}
        currentCustomTitle={customTitle}
        onLoadSlot={handleLoadSlot}
        onDeleteSlot={handleDeleteSlot}
        onQuickSave={handleQuickSaveFromLoad}
        readSlots={readSlots}
        setSlots={setSlots}
        products={products}
      />

      {/* ════════════ MODAL: PAYWALL ════════════ */}
      <PaywallModal
        visible={showPaywallModal}
        onClose={() => {
          setShowPaywallModal(false);
          loadCustomerInfo();
        }}
        customerInfo={customerInfo}
      />

      {/* ════════════ APP DIALOG (substitui Alert.alert) ════════════ */}
      <AppDialog solMode={solMode} config={dialogConfig} show={showDialog} dismiss={dismissDialog} />

      {/* ════════════ MODAL: PRODUCTS ════════════ */}
      <ProductsModal
        visible={showProductsModal}
        solMode={solMode}
        onClose={() => setShowProductsModal(false)}
        products={products}
        onAddProduct={addProduct}
        onUpdateProduct={updateProduct}
        onDeleteProduct={deleteProduct}
      />

      {/* ════════════ MODAL: FINALIZE ════════════ */}
      <FinalizeModal
        visible={showFinalizeModal}
        solMode={solMode}
        onClose={() => setShowFinalizeModal(false)}
        products={products}
        quantities={quantities}
        totalValue={totalValue}
        totalWeight={totalWeight}
        totalQty={totalQty}
      />
    </SafeAreaProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const RED = "#509AE2";
const GREEN = "#2e7d32";
const LABEL_COLOR = "#888";
const BORDER_COLOR = "#ddd";
const BG = "#f2f2f2";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#fff" },
  scrollView: { flex: 1, backgroundColor: BG },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  bannerContainer: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
    marginBottom: 0,
    height: 50
  },

  // ── Header ──
  fixedTop: { backgroundColor: "#fff" },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
    marginRight: 8,
  },

  // ── Custom title input — linha própria ──
  titleInputRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  customTitleInput: {
    backgroundColor: "#f8f8f8",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 11 : 9,
    fontSize: 15,
    color: "#333",
  },

  // ── Menu ──
  menuButton: { padding: 8, borderRadius: 20, backgroundColor: "#f0f0f0" },
  menuOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "transparent", zIndex: 1000,
  },
  menuDropdown: {
    position: "absolute", top: 56, right: 16, backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8,
    elevation: 6, zIndex: 1001, minWidth: 170, overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  menuItemText: { marginLeft: 12, fontSize: 15, fontWeight: "500" },

  // ── Stats ──
  statsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  statBlock: { alignItems: "flex-start", flex: 1 },
  statBlockRight: { alignItems: "flex-end" },
  statLabel: { fontSize: 11, color: LABEL_COLOR, fontWeight: "600", letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },

  // ── Price ──
  divider: { height: 1, backgroundColor: BORDER_COLOR, marginTop: 2 },

  // ── Empty / Table ──
  emptyText: { textAlign: "center", color: LABEL_COLOR, marginTop: 40, fontSize: 15 },
  itemRow: { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  itemRowActive: { backgroundColor: "#f0f9ff" },
  itemMain: { flex: 1, justifyContent: "center" },
  itemName: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  itemDetails: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  itemDetail: { fontSize: 12, color: "#666", fontWeight: "500" },
  itemSubtotal: { fontSize: 13, fontWeight: "700", color: GREEN },
  itemActions: { alignItems: "center", gap: 8, paddingLeft: 8 },
  qtyInputList: {
    width: 60,
    borderWidth: 1.5,
    borderColor: "#2196f3",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 16,
    color: "#1a1a1a",
    backgroundColor: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },
  counterRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 6, gap: 10, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  counterBarWrap: { flex: 1, height: 4, borderRadius: 99, backgroundColor: "#f0f0f0", overflow: "hidden" },
  counterFill: { height: "100%", borderRadius: 99 },
  counterText: { fontSize: 11, fontWeight: "600", color: LABEL_COLOR, minWidth: 56, textAlign: "right" },

  // ── Bottom bar ──
  bottomBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: BORDER_COLOR,
    paddingHorizontal: 12, paddingVertical: 10, gap: 10, marginBottom: 50,
  },
  zeroButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffebee",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  zeroButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#e53935",
  },
  finalizeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#2e7d32",
    borderRadius: 8,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
  },
  finalizeButtonDisabled: { opacity: 0.5 },
  finalizeButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },

});

// ─── Modo sol (SÓ cores) ──────────────────────────────────────────────────────

const sol = StyleSheet.create({
  bg: { backgroundColor: "#000" },
  text: { color: "#fff" },
  yellow: { color: "#ff0" },
  detail: { color: "#ddd" },
  btn: { backgroundColor: "#333" },
  divider: { backgroundColor: "#555" },
  input: { backgroundColor: "#222", color: "#fff", borderColor: "#ff0" },
  menu: { backgroundColor: "#000", borderWidth: 1, borderColor: "#ff0" },
  menuItem: { borderBottomColor: "#444" },
  counterRow: { backgroundColor: "#000", borderBottomColor: "#555" },
  itemRow: { backgroundColor: "#000", borderBottomColor: "#444" },
  itemRowActive: { backgroundColor: "#1c1c00" },
  bottomBar: { backgroundColor: "#000", borderTopColor: "#555" },
  zeroButton: { backgroundColor: "#000", borderColor: "#e53935" },
  zeroText: { color: "#ff5252" },
  finalize: { backgroundColor: "#ff0" },
  finalizeText: { color: "#000" },
});
