// src/services/whatsappService.ts

import * as Linking from 'expo-linking';
import { Conference, Product } from '../types';
import { formatWeight, formatCurrency, getDisplayName } from '../utils/formatters';

export function formatConferenceForWhatsApp(conference: Conference, products: Product[]): string {
    const lines: string[] = [];
    lines.push(`📋 *${getDisplayName(conference)}*`);
    lines.push('');

    const quantities = conference.quantities || {};
    Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([productId, qty]) => {
            const product = products.find(p => p.id === productId);
            if (!product) return;
            const qtyText = product.priceType === 'kg'
                ? `${formatWeight(qty)} kg`
                : `${qty} un`;
            const weightText = product.priceType === 'kg'
                ? `= ${formatWeight(qty)} kg`
                : '';
            lines.push(`${product.name} × ${qtyText} ${weightText}`);
        });

    lines.push('─────────────────');
    const totalWeight = Object.entries(quantities).reduce((sum, [productId, qty]) => {
        const product = products.find(p => p.id === productId);
        if (!product || product.priceType !== 'kg') return sum;
        return sum + qty;
    }, 0);
    const totalValue = Object.entries(quantities).reduce((sum, [productId, qty]) => {
        const product = products.find(p => p.id === productId);
        if (!product) return sum;
        return sum + (qty * product.price);
    }, 0);
    lines.push(`*Peso total: ${formatWeight(totalWeight)} kg*`);
    lines.push(`*Valor total: ${formatCurrency(totalValue)}*`);

    return lines.join('\n');
}

export async function shareViaWhatsApp(conference: Conference, products: Product[], phone: string): Promise<void> {
    const message = formatConferenceForWhatsApp(conference, products);
    const encodedMessage = encodeURIComponent(message);

    // Formata o número para o WhatsApp (55 + DDD + número)
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappPhone = `55${cleanPhone}`;

    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;

    const supported = await Linking.canOpenURL(whatsappUrl);
    if (supported) {
        await Linking.openURL(whatsappUrl);
    } else {
        throw new Error('WhatsApp não está instalado');
    }
}
