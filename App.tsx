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
import { ProductAutocomplete } from "./src/components/ProductAutocomplete";
import { WeightItem, Conference, Product, PriceType } from "./src/types";
import { formatWeight, formatCurrency, formatPriceInput, parsePriceInput, formatWeightInput, parseWeightInput, formatDate, generateConferenceName, getDisplayName } from "./src/utils/formatters";
import { Toast } from "./src/components/Toast";
import { useSlots } from "./src/hooks/useSlots";
import { useProducts } from "./src/hooks/useProducts";
import { SaveModal } from "./src/modals/SaveModal";
import { LoadModal } from "./src/modals/LoadModal";
import { ShareModal } from "./src/modals/ShareModal";
import { PaywallModal } from "./src/modals/PaywallModal";
import { QuickProductModal } from "./src/modals/QuickProductModal";
import { ProductsModal } from "./src/modals/ProductsModal";
import { shareViaWhatsApp } from "./src/services/whatsappService";
import { generateAndSharePDF } from "./src/services/printService";
// import { usePurchases } from "./src/hooks/usePurchases";

// ─── Component ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 80; // Aumentado para 2 linhas por item
const HEADER_HEIGHT = 42;
const MAX_ITENS_FREE = parseInt(process.env.EXPO_PUBLIC_MAX_ITENS_FREE ?? "50");
const MAX_ITENS_PREMIUM = parseInt(process.env.EXPO_PUBLIC_MAX_ITENS_PREMIUM ?? "999");

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function App() {
  const [items, setItems] = useState<WeightItem[]>([]);
  const [productSearch, setProductSearch] = useState<string>("");
  const [qtyInput, setQtyInput] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const afterSaveRef = useRef<(() => void) | null>(null);
  const lastAddedIdRef = useRef<string | null>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
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

  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
  const totalWeight = items.reduce((sum, i) => sum + i.totalWeight, 0);
  const totalValue = items.reduce((sum, i) => sum + i.subtotal, 0);

  const MAX_SLOTS_FREE = parseInt(process.env.EXPO_PUBLIC_MAX_SLOTS_FREE ?? "20");
  const MAX_SLOTS_PREMIUM = parseInt(process.env.EXPO_PUBLIC_MAX_SLOTS_PREMIUM ?? "999");
  const maxSlots = isPremium ? MAX_SLOTS_PREMIUM : MAX_SLOTS_FREE;

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

  const sortedItems = [...items].sort((a, b) => a.productName.localeCompare(b.productName));

  useEffect(() => {
    if (lastAddedIdRef.current === null || items.length === 0) return;
    const id = lastAddedIdRef.current;
    lastAddedIdRef.current = null;

    setTimeout(() => {
      const idx = sortedItems.findIndex(i => i.id === id);
      if (idx !== -1) {
        scrollViewRef.current?.scrollTo({
          y: HEADER_HEIGHT + idx * ROW_HEIGHT,
          animated: true,
        });
      }
    }, 80);
  }, [items]);

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
  }, [currentSlot, slots]);

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

  const handleAddProduct = useCallback(() => {
    if (!selectedProduct) return;

    const qty = selectedProduct.priceType === 'kg'
      ? parseWeightInput(qtyInput)
      : parseFloat(qtyInput.replace(",", "."));
    if (!qty || qty <= 0) return;

    const isNew = !items.find(i => i.productId === selectedProduct.id);

    const maxItens = isPremium ? MAX_ITENS_PREMIUM : MAX_ITENS_FREE;
    if (isNew && items.length >= maxItens) {
      showDialog({
        title: "Limite do plano gratuito",
        message: `Você atingiu ${MAX_ITENS_FREE} tipos de produto por pesagem. Assine o Premium para conferências ilimitadas.`,
        variant: "premium",
        confirmLabel: "Ver Premium",
        cancelLabel: "Agora não",
        onConfirm: () => {
          setShowPaywallModal(true);
        },
      });
      setProductSearch("");
      setQtyInput("");
      setSelectedProduct(null);
      return;
    }

    // Calcular peso total e subtotal
    let totalWeight: number;
    let subtotal: number;

    if (selectedProduct.priceType === "kg") {
      totalWeight = qty;
      subtotal = qty * selectedProduct.price;
    } else {
      // Vendido por unidade - peso total é 0 (não usado)
      totalWeight = 0;
      subtotal = qty * selectedProduct.price;
    }

    lastAddedIdRef.current = Date.now().toString();
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === selectedProduct.id);
      if (idx !== -1) {
        // Atualizar item existente
        const existing = prev[idx];
        const newQty = existing.qty + qty;
        const newTotalWeight = existing.productPriceType === "kg"
          ? existing.totalWeight + qty
          : 0; // Por unidade, peso total não é usado
        const newSubtotal = existing.subtotal + subtotal;

        const u = [...prev];
        u[idx] = {
          ...u[idx],
          qty: newQty,
          totalWeight: newTotalWeight,
          subtotal: newSubtotal,
        };
        return u;
      }
      // Adicionar novo item
      return [...prev, {
        id: Date.now().toString(),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productPrice: selectedProduct.price,
        productPriceType: selectedProduct.priceType,
        qty,
        totalWeight,
        subtotal,
      }];
    });
    setProductSearch("");
    setQtyInput("");
    setSelectedProduct(null);
  }, [selectedProduct, qtyInput, items, isPremium]);



  const handleRemove = useCallback((id: string) => {
    showDialog({
      title: "Excluir produto?",
      message: "Este produto será removido da lista.",
      variant: "destructive",
      confirmLabel: "Excluir",
      onConfirm: () => setItems((prev) => prev.filter((i) => i.id !== id)),
    });
  }, [showDialog]);

  const handleClearAll = useCallback(() => {
    showDialog({
      title: "Limpar pesagem?",
      message: "Todos os itens serão removidos. Essa ação não pode ser desfeita.",
      variant: "destructive",
      confirmLabel: "Limpar",
      onConfirm: () => {
        setItems([]);
        setCustomTitle("");
      },
    });
  }, [showDialog]);

  const handleOpenSaveModal = useCallback(() => {
    if (items.length === 0) {
      showDialog({
        title: "Nada para salvar",
        message: "Adicione pelo menos um peso antes de salvar.",
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
  }, [items, customTitle, currentSlot, slots]);

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
        setItems([]);
        setProductSearch("");
        setQtyInput("");
        setSelectedProduct(null);
        setCustomTitle("");
        setCurrentSlot(null);
      },
    });
  }, [showDialog, handleOpenSaveModal]);

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
        items,
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
    setItems(conf.items);
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
      await shareViaWhatsApp(conference, phone);
      showToast("Enviando para WhatsApp...");
    } catch (error) {
      showDialog({
        title: "Erro",
        message: "Não foi possível abrir o WhatsApp. Verifique se o app está instalado.",
        variant: "alert",
      });
    }
  }, []);

  const handleSharePDF = useCallback(async (conference: Conference) => {
    try {
      await generateAndSharePDF(conference);
      showToast("PDF gerado com sucesso!");
    } catch (error) {
      showDialog({
        title: "Erro",
        message: "Não foi possível gerar o PDF.",
        variant: "alert",
      });
    }
  }, []);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductSearch(product.name);
  };

  const handleCreateProduct = () => {
    setShowQuickProductModal(true);
  };

  const handleQuickProductSave = async (data: { name: string; price: number; priceType: PriceType; unitWeight?: number }) => {
    const newProduct = await addProduct(data);
    setSelectedProduct(newProduct);
    setProductSearch(newProduct.name);
    setShowQuickProductModal(false);
  };

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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* ── Menu ── */}
          {showMenu && (
            <>
              <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)} />
              <View style={styles.menuDropdown}>
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
                  { label: "Limpar", icon: "trash", color: "#e53935", onPress: () => { handleClearAll(); setShowMenu(false); } },
                  { label: "Meu ID", icon: "phone-portrait", color: "#888", onPress: handleShowIds },
                  { label: "Premium", icon: "star", color: "#FFC83D", onPress: () => { setShowMenu(false); setShowPaywallModal(true) } },
                ] as const).map((item, i, arr) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.menuItem, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={item.onPress}
                  >
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                    <Text style={[styles.menuItemText, { color: item.color }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── Header ── */}
          <View style={styles.fixedTop}>
            {/* Título do app + botão menu */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{Constants.expoConfig?.extra?.APP_NAME || 'Calculadora do Feirante'}</Text>
              <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(!showMenu)}>
                <Ionicons name="menu" size={26} color="#555" />
              </TouchableOpacity>
            </View>

            {/* Campo de título personalizado — linha própria, largura total */}
            <View style={styles.titleInputRow}>
              <TextInput
                style={styles.customTitleInput}
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
                <Text style={styles.statLabel}>ITENS</Text>
                <Text style={styles.statValue}>{totalQty}</Text>
              </View>
              <View style={[styles.statBlock, styles.statBlockRight]}>
                <Text style={styles.statLabel}>VALOR TOTAL</Text>
                <Text style={styles.statValue}>{formatCurrency(totalValue)}</Text>
              </View>
            </View>

            <View style={styles.divider} />
          </View>

          {items.length > 0 && !isPremium && (
            <View style={styles.counterRow}>
              <View style={styles.counterBarWrap}>
                <View style={[styles.counterFill, {
                  width: `${Math.min((items.length / MAX_ITENS_FREE) * 100, 100)}%` as any,
                  backgroundColor:
                    items.length >= MAX_ITENS_FREE ? "#e53935"
                      : items.length >= MAX_ITENS_FREE * 0.8 ? "#ff9800"
                        : "#509AE2",
                }]} />
              </View>
              <Text style={[
                styles.counterText,
                items.length >= MAX_ITENS_FREE * 0.8 && { color: "#ff9800" },
                items.length >= MAX_ITENS_FREE && { color: "#e53935", fontWeight: "700" },
              ]}>
                {items.length}/{MAX_ITENS_FREE} produtos
              </Text>
            </View>
          )}
          {/* ── List ── */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {items.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum produto adicionado ainda.</Text>
            ) : (
              <>
                {sortedItems.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemMain}>
                      <Text style={styles.itemName}>{item.productName}</Text>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemDetail}>
                          QTD: {item.productPriceType === 'kg' ? formatWeight(item.qty) + ' kg' : item.qty + ' un'}
                        </Text>
                        {item.productPriceType === 'kg' && (
                          <Text style={styles.itemDetail}>
                            Peso: {formatWeight(item.totalWeight)} kg
                          </Text>
                        )}
                        <Text style={[styles.itemDetail, styles.itemSubtotal]}>
                          {formatCurrency(item.subtotal)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.itemActions}>
                      <TextInput
                        style={styles.qtyInputList}
                        value={item.qty.toString()}
                        onChangeText={(text) => {
                          if (text === "" || text === ".") {
                            // Permite apagar completamente, mas não atualiza
                            return;
                          }
                          const newQty = parseFloat(text.replace(",", "."));
                          if (!isNaN(newQty) && newQty > 0) {
                            const price = item.productPriceType === 'kg'
                              ? newQty * item.productPrice
                              : newQty * item.productPrice;
                            const totalWeight = item.productPriceType === 'kg' ? newQty : 0;
                            setItems(prev => prev.map(i =>
                              i.id === item.id
                                ? { ...i, qty: newQty, totalWeight, subtotal: price }
                                : i
                            ));
                          }
                        }}
                        keyboardType="numeric"
                        returnKeyType="done"
                      />
                      <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.trashButton} activeOpacity={0.7}>
                        <Ionicons name="trash" size={20} color="#509AE2" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          {/* ── Bottom bar ── */}
          <View style={styles.bottomBar}>
            {selectedProduct ? (
              // Produto selecionado - mostra nome fixo e campo de quantidade
              <>
                <View style={styles.selectedProductContainer}>
                  <View style={styles.selectedProductBadge}>
                    <Ionicons name="pricetag" size={16} color="#fff" />
                    <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
                    <TouchableOpacity onPress={() => { setSelectedProduct(null); setProductSearch(""); setQtyInput(""); }}>
                      <Ionicons name="close-circle" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.qtyInputCompact}
                    value={qtyInput}
                    onChangeText={(t) => {
                      if (selectedProduct.priceType === 'kg') {
                        setQtyInput(formatWeightInput(t));
                      } else {
                        setQtyInput(t);
                      }
                    }}
                    keyboardType="numeric"
                    placeholder={selectedProduct.priceType === 'kg' ? "0,000 kg" : "0 un"}
                    placeholderTextColor="#aaa"
                    returnKeyType="done"
                    blurOnSubmit={false}
                    onSubmitEditing={handleAddProduct}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.addButton, !qtyInput && styles.addButtonDisabled]}
                  onPress={handleAddProduct}
                  activeOpacity={0.85}
                  disabled={!qtyInput}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Adicionar</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Buscando produto - mostra autocomplete
              <>
                <View style={styles.inputContainer}>
                  <ProductAutocomplete
                    products={products}
                    value={productSearch}
                    onChangeText={setProductSearch}
                    onSelectProduct={handleSelectProduct}
                    onCreateNew={handleCreateProduct}
                    placeholder="Buscar produto..."
                  />
                </View>
                <TouchableOpacity
                  style={styles.productsMenuButton}
                  onPress={() => setShowProductsModal(true)}
                >
                  <Ionicons name="pricetag" size={20} color="#FF9800" />
                  <Text style={styles.productsMenuButtonText}>Produtos</Text>
                </TouchableOpacity>
              </>
            )}
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
        currentItems={items}
        currentCustomTitle={customTitle}
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
        onClose={() => setShowSaveModal(false)}
        customTitle={customTitle}
        onChangeTitle={setCustomTitle}
        onQuickSave={handleQuickSave}
      />

      {/* ════════════ MODAL: CARREGAR ════════════ */}
      <LoadModal
        visible={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        slots={slots}
        currentSlot={currentSlot}
        currentItems={items}
        currentCustomTitle={customTitle}
        onLoadSlot={handleLoadSlot}
        onDeleteSlot={handleDeleteSlot}
        onQuickSave={handleQuickSaveFromLoad}
        readSlots={readSlots}
        setSlots={setSlots}
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
      <AppDialog config={dialogConfig} show={showDialog} dismiss={dismissDialog} />

      {/* ════════════ MODAL: QUICK PRODUCT ════════════ */}
      <QuickProductModal
        visible={showQuickProductModal}
        onClose={() => setShowQuickProductModal(false)}
        onSave={handleQuickProductSave}
        initialName={productSearch}
      />

      {/* ════════════ MODAL: PRODUCTS ════════════ */}
      <ProductsModal
        visible={showProductsModal}
        onClose={() => setShowProductsModal(false)}
        products={products}
        onAddProduct={addProduct}
        onUpdateProduct={updateProduct}
        onDeleteProduct={deleteProduct}
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
  trashButton: { padding: 4 },
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
  inputContainer: { flex: 1, gap: 8 },
  selectedProductContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedProductBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FF9800",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedProductName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    maxWidth: 120,
  },
  qtyInputCompact: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 16,
    color: "#1a1a1a",
    backgroundColor: "#fafafa",
    textAlign: "right",
    fontWeight: "700",
  },
  qtyInput: {
    borderWidth: 1.5, borderColor: BORDER_COLOR,
    borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16, color: "#1a1a1a", backgroundColor: "#fafafa",
    textAlign: "right", fontWeight: "700",
  },
  addButton: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#509AE2", borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 14 : 12,
  },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  productsMenuButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  productsMenuButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF9800",
  },

});
