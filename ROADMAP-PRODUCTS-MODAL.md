# Roadmap - Melhorias no ProductsModal

## Problemas identificados

1. **Scroll limitado:** O ScrollView tem `maxHeight: 400` fixo, impedindo que a lista cresça dinamicamente
2. **Falta de busca:** Não há funcionalidade para pesquisar produtos por nome

## Passo a passo das alterações

### Modificação 1: Remover maxHeight fixo e usar flex

**Arquivo:** `src/modals/ProductsModal.tsx`
**Linha:** 269

**Antes:**
```typescript
productsList: { maxHeight: 400 },
```

**Depois:**
```typescript
productsList: { flex: 1 },
```

---

### Modificação 2: Adicionar estado de busca

**Arquivo:** `src/modals/ProductsModal.tsx`
**Linhas:** 20-26

**Antes:**
```typescript
export function ProductsModal({ solMode, visible, onClose, products, onAddProduct, onUpdateProduct, onDeleteProduct }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [priceType, setPriceType] = useState<PriceType>("kg");
    const [showPriceModal, setShowPriceModal] = useState(false);
```

**Depois:**
```typescript
export function ProductsModal({ solMode, visible, onClose, products, onAddProduct, onUpdateProduct, onDeleteProduct }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [priceType, setPriceType] = useState<PriceType>("kg");
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
```

---

### Modificação 3: Adicionar lógica de filtragem

**Arquivo:** `src/modals/ProductsModal.tsx`
**Linha:** 105 (após `const isValid = name.trim() && price;`)

**Antes:**
```typescript
    const isValid = name.trim() && price;
```

**Depois:**
```typescript
    const isValid = name.trim() && price;

    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
```

---

### Modificação 4: Adicionar campo de busca na UI

**Arquivo:** `src/modals/ProductsModal.tsx`
**Linhas:** 189-195 (após o botão "Novo Produto")

**Antes:**
```typescript
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={handleNewProduct}
                            >
                                <Ionicons name="add-circle" size={20} color="#fff" />
                                <Text style={styles.addButtonText}>Novo Produto</Text>
                            </TouchableOpacity>
```

**Depois:**
```typescript
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={handleNewProduct}
                            >
                                <Ionicons name="add-circle" size={20} color="#fff" />
                                <Text style={styles.addButtonText}>Novo Produto</Text>
                            </TouchableOpacity>

                            <View style={[styles.searchContainer, solMode && sol.searchContainer]}>
                                <Ionicons name="search" size={18} color={solMode ? "#ff0" : "#888"} style={styles.searchIcon} />
                                <TextInput
                                    style={[styles.searchInput, solMode && sol.searchInput]}
                                    placeholder="Buscar produto..."
                                    placeholderTextColor={solMode ? "#888" : "#bbb"}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                                        <Ionicons name="close-circle" size={18} color={solMode ? "#ff0" : "#888"} />
                                    </TouchableOpacity>
                                )}
                            </View>
```

---

### Modificação 5: Usar produtos filtrados no map

**Arquivo:** `src/modals/ProductsModal.tsx`
**Linha:** 201

**Antes:**
```typescript
                                    products.map((product) => (
```

**Depois:**
```typescript
                                    filteredProducts.map((product) => (
```

---

### Modificação 6: Atualizar mensagem de empty

**Arquivo:** `src/modals/ProductsModal.tsx`
**Linhas:** 198-200

**Antes:**
```typescript
                                {products.length === 0 ? (
                                    <Text style={[styles.emptyText, solMode && sol.emptyText]}>Nenhum produto cadastrado.</Text>
```

**Depois:**
```typescript
                                {filteredProducts.length === 0 ? (
                                    <Text style={[styles.emptyText, solMode && sol.emptyText]}>
                                        {searchQuery ? "Nenhum produto encontrado." : "Nenhum produto cadastrado."}
                                    </Text>
```

---

### Modificação 7: Adicionar estilos da busca

**Arquivo:** `src/modals/ProductsModal.tsx`
**Linha:** 277 (após `modalCloseButton`)

**Antes:**
```typescript
    modalCloseButton: { backgroundColor: "#f0f0f0", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
```

**Depois:**
```typescript
    modalCloseButton: { backgroundColor: "#f0f0f0", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
    searchContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, backgroundColor: "#fafafa" },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, color: "#1a1a1a" },
```

---

### Modificação 8: Adicionar estilos sol para a busca

**Arquivo:** `src/modals/ProductsModal.tsx`
**Linha:** 297 (após `emptyText` no objeto `sol`)

**Antes:**
```typescript
    emptyText: { color: "#ddd" },
```

**Depois:**
```typescript
    emptyText: { color: "#ddd" },
    searchContainer: { backgroundColor: "#222", borderColor: "#555" },
    searchInput: { color: "#fff" },
```

---

### Modificação 9: Resetar busca ao fechar modal

**Arquivo:** `src/modals/ProductsModal.tsx`
**Linhas:** 29-38

**Antes:**
```typescript
    React.useEffect(() => {
        if (!visible) {
            setShowPriceModal(false);
            setIsEditing(false);
            setEditingProduct(null);
            setName("");
            setPrice("");
            setPriceType("kg");
        }
    }, [visible]);
```

**Depois:**
```typescript
    React.useEffect(() => {
        if (!visible) {
            setShowPriceModal(false);
            setIsEditing(false);
            setEditingProduct(null);
            setName("");
            setPrice("");
            setPriceType("kg");
            setSearchQuery("");
        }
    }, [visible]);
```

---

## Resumo

1. **Scroll:** Alterar `maxHeight: 400` para `flex: 1` no estilo `productsList`
2. **Busca:** Adicionar estado `searchQuery`
3. **Filtro:** Criar `filteredProducts` usando o estado de busca
4. **UI:** Adicionar campo de busca com ícone e botão de limpar
5. **Map:** Usar `filteredProducts` em vez de `products`
6. **Mensagem:** Atualizar texto de empty para diferenciar "nenhum cadastrado" de "nenhum encontrado"
7. **Estilos:** Adicionar estilos para `searchContainer`, `searchIcon` e `searchInput`
8. **Sol:** Adicionar estilos do modo sol para os novos componentes
9. **Reset:** Limpar `searchQuery` ao fechar o modal
