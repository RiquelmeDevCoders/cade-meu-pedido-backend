require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Mock database (em produção, use um banco de dados real)
let orders = {};

// Rota para adicionar/atualizar um pedido
app.post('/api/orders', async (req, res) => {
    const { orderId, platform, trackingInfo } = req.body;

    if (!orderId || !platform) {
        return res.status(400).json({ error: 'orderId and platform are required' });
    }

    orders[orderId] = {
        platform,
        trackingInfo,
        lastUpdated: new Date().toISOString()
    };

    res.status(201).json(orders[orderId]);
});

// Rota para obter informações de um pedido
app.get('/api/orders/:orderId', async (req, res) => {
    const { orderId } = req.params;

    if (!orders[orderId]) {
        return res.status(404).json({ error: 'Order not found' });
    }

    // Aqui você pode integrar com APIs reais de rastreamento
    // Exemplo para Mercado Livre (simulado):
    if (orders[orderId].platform === 'mercadolivre') {
        try {
            // Simulação de chamada à API do Mercado Livre
            const status = await simulatePlatformAPI('mercadolivre', orderId);
            orders[orderId].trackingInfo = status;
        } catch (error) {
            console.error('Error fetching tracking info:', error);
        }
    }

    // Usar IA para análise do status
    if (orders[orderId].trackingInfo?.status) {
        const aiAnalysis = await analyzeWithAI(orders[orderId].trackingInfo.status);
        orders[orderId].aiAnalysis = aiAnalysis;
    }

    res.json(orders[orderId]);
});

// Função para simular integração com plataformas de e-commerce
async function simulatePlatformAPI(platform, orderId) {
    // Em um projeto real, você faria chamadas às APIs oficiais
    const statuses = {
        mercadolivre: [
            "Pedido recebido",
            "Preparando para envio",
            "Enviado",
            "Em trânsito",
            "Entregue"
        ],
        amazon: [
            "Order placed",
            "Preparing for shipment",
            "Shipped",
            "Out for delivery",
            "Delivered"
        ],
        shopee: [
            "Pedido confirmado",
            "Processando",
            "Enviado",
            "A caminho",
            "Entregue"
        ]
    };

    const randomStatus = statuses[platform][Math.floor(Math.random() * statuses[platform].length)];

    return {
        status: randomStatus,
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        history: [
            {
                status: randomStatus,
                date: new Date().toISOString(),
                location: "Centro de distribuição"
            }
        ]
    };
}

// Função para análise com IA
async function analyzeWithAI(statusText) {
    try {
        const prompt = `Analise o seguinte status de entrega e forneça:
    1. Uma explicação simples do que significa
    2. Se há algum problema potencial
    3. Sugestões para o cliente
    4. Classifique em: recebido, processamento, transporte, entrega, entregue
    
    Status: "${statusText}"`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error with OpenAI:', error);
        return "Análise não disponível no momento";
    }
}

// Rota para perguntas via IA
app.post('/api/ask-ai', async (req, res) => {
    const { question, orderId } = req.body;

    if (!question) {
        return res.status(400).json({ error: 'Question is required' });
    }

    try {
        const orderInfo = orders[orderId] ? JSON.stringify(orders[orderId]) : 'Nenhuma informação adicional sobre o pedido';

        const prompt = `Você é um assistente de rastreamento de pedidos chamado Riquelme. 
    Responda à seguinte pergunta sobre um pedido de e-commerce de forma amigável e útil.
    
    Informações do pedido (se disponível): ${orderInfo}
    
    Pergunta: "${question}"
    
    Responda em português brasileiro de forma natural.`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        res.json({ answer: response.choices[0].message.content });
    } catch (error) {
        console.error('Error with OpenAI:', error);
        res.status(500).json({ error: 'Error processing your question' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});