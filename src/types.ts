//src/types.ts

export type PriceType = 'kg' | 'unit';

export interface Product {
    id: string;
    name: string;
    price: number;
    priceType: PriceType;
    createdAt: number;
}

export interface WeightItem {
    id: string;
    productId: string;
    productName: string;
    productPrice: number;
    productPriceType: PriceType;
    qty: number; // Quantidade em kg ou unidades
    totalWeight: number; // Peso total em kg (se vendido por kg, igual a qty; se por unidade, 0)
    subtotal: number; // Valor total (R$)
}

export interface Conference {
    id: string;
    name: string;
    customTitle?: string;
    date: string;
    items: WeightItem[];
    createdAt: number;
}
