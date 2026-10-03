// src/services/whatsappService.ts

import * as Linking from 'expo-linking';
import { Conference } from '../types';
import { formatWeight, formatCurrency, getDisplayName } from '../utils/formatters';

export function formatConferenceForWhatsApp(conference: Conference): string {
    const lines: string[] = [];
    lines.push(`📋 *${getDisplayName(conference)}*`);
    lines.push('');

    [...conference.items].sort((a,b) => a.productName.localeCompare(b.productName)).forEach(item => {
        const qtyText = item.productPriceType === 'kg'
            ? `${formatWeight(item.qty)} kg`
            : `${item.qty} un`;
        const weightText = item.productPriceType === 'kg'
            ? `= ${formatWeight(item.totalWeight)} kg`
            : '';
        lines.push(`${item.productName} × ${qtyText} ${weightText}`);
    });

    lines.push('─────────────────');
    const totalWeight = conference.items.reduce((sum, i) => sum + i.totalWeight, 0);
    const totalValue = conference.items.reduce((sum, i) => sum + i.subtotal, 0);
    lines.push(`*Peso total: ${formatWeight(totalWeight)} kg*`);
    lines.push(`*Valor total: ${formatCurrency(totalValue)}*`);

    return lines.join('\n');
}

export async function shareViaWhatsApp(conference: Conference, phone: string): Promise<void> {
    const message = formatConferenceForWhatsApp(conference);
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
