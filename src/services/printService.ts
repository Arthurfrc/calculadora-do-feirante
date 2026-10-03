// src/services/printService.ts

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Conference } from '../types';
import { formatWeight, formatCurrency, getDisplayName, formatDate } from '../utils/formatters';

export async function generateAndSharePDF(conference: Conference): Promise<void> {
    const totalWeight = conference.items.reduce((sum, i) => sum + i.totalWeight, 0);
    const totalValue = conference.items.reduce((sum, i) => sum + i.subtotal, 0);

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; border-bottom: 2px solid #25D366; padding-bottom: 10px; }
                .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f5f5f5; font-weight: bold; }
                .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
                .value { color: #2e7d32; font-size: 20px; }
            </style>
        </head>
        <body>
            <h1>📋 ${getDisplayName(conference)}</h1>
            <div class="meta">Data: ${formatDate(conference.date)}</div>

            <table>
                <tr>
                    <th>Produto</th>
                    <th>Qtd</th>
                    <th>Peso Total (kg)</th>
                    <th>Subtotal (R$)</th>
                </tr>
                ${[...conference.items].sort((a, b) => a.productName.localeCompare(b.productName)).map(item => {
                    const qtyText = item.productPriceType === 'kg'
                        ? `${formatWeight(item.qty)} kg`
                        : `${item.qty} un`;
                    const weightText = item.productPriceType === 'kg'
                        ? formatWeight(item.totalWeight)
                        : '-';
                    return `
                    <tr>
                        <td>${item.productName}</td>
                        <td>${qtyText}</td>
                        <td>${weightText}</td>
                        <td>${formatCurrency(item.subtotal)}</td>
                    </tr>
                `;
                }).join('')}
            </table>

            <div class="total">Peso Total: ${formatWeight(totalWeight)} kg</div>
            <div class="value">Valor Total: ${formatCurrency(totalValue)}</div>
        </body>
        </html>
    `;

    try {
        const { uri } = await Print.printToFileAsync({ html });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Compartilhar PDF',
            });
        } else {
            throw new Error('Compartilhamento não disponível');
        }
    } catch (error) {
        throw new Error('Erro ao gerar PDF: ' + (error as Error).message);
    }
}
