// ============================================================
// UPLOAD PROXY UNTUK VERCEL (FULL + API KEY)
// ============================================================

const FormData = require('form-data');
const fetch = require('node-fetch');

// ========== 🔑 API KEY & CREATOR ID (SUDAH DIISI) ==========
const API_KEY = "IxxHZgbWeUKnNnHcKbujDceXSM+oHzQmZt5utefCBpdAIFt6ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SWtsNGVFaGFaMkpYWlZWTGJrNXVTR05MWW5WcVJHTmxXRk5OSzI5SWVsRnRXblExZFhSbFprTkNjR1JCU1VaME5pSXNJbTkzYm1WeVNXUWlPaUk0TXpnd05EZ3pNRGs0SWl3aVpYaHdJam94TnpnME5EVTVOamsxTENKcFlYUWlPakUzT0RRME5UWXdPVFVzSW01aVppSTZNVGM0TkRRMU5qQTVOWDAuQXBMM2pCV190OVpKMnRHOEZyaWF4aEhvVU9PRmdkd3pNZE9GMG1lcGVsaHdadVZpZTdhZjIwaUMyRVppQ0Nvd2dQcVRvUEtWMERud2pxRG4yLU43Ny1oaHJfeDVYLWljOFJWS1ZiaEVVU2laS3J0a21QVHowQWpKSkwtYkg5UjdNMWU0dHNaVW4wQUZEX2ZKQTY5bndqakw4QXE5aWJZUkEtMGpJZVVUcXhrekZiRFloaFRTeWYtajdBXy1qSFlRcm95b0pCMEItS2c4dkx0Zzd4SHhkQUtVV0g5ZnM3QkxSaU5zZFFveWJraFpnd19BZFlUWHoxeW9OVlNxQWZZRkNKSHNqTkF2OEJUd1M1aFM3Mm9ZeDlNTzlDV1BDbGw5akcxT200U1RrMnIyV2lSbjhWNzFMbkVPWkI4ZVhsTkxtQXdnSFREb0NCSG9sLWtWYXlUWUt3";
const CREATOR_ID = 8380483098;
const CREATOR_TYPE = "user";

// ============================================================

export default async function handler(req, res) {
    // ========== CORS ==========
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // ========== AMBIL DATA ==========
        const { fileData, fileName } = req.body;

        if (!fileData) {
            return res.status(400).json({ error: 'fileData is required' });
        }

        // ========== KONVERSI BASE64 KE BUFFER ==========
        const cleanBase64 = fileData.replace(/\s/g, '').replace(/\n/g, '').replace(/\r/g, '');
        const fileBuffer = Buffer.from(cleanBase64, 'base64');

        if (fileBuffer.length < 10) {
            return res.status(400).json({ error: 'File terlalu kecil atau corrupt. Size: ' + fileBuffer.length });
        }

        console.log(`📤 Uploading: ${fileName || 'model.rbxm'}`);
        console.log(`📦 Size: ${fileBuffer.length} bytes`);
        console.log(`👤 Creator: ${CREATOR_TYPE} ${CREATOR_ID}`);

        // ========== BUILD FORM DATA ==========
        const form = new FormData();
        
        const assetMetadata = {
            creator: {
                type: CREATOR_TYPE,
                id: CREATOR_ID
            },
            assetType: 'Model',
            displayName: fileName || `Model_${Date.now()}`,
            description: 'Uploaded from Delta via Vercel Proxy'
        };
        
        form.append('request', JSON.stringify(assetMetadata));
        form.append('fileContent', fileBuffer, {
            filename: fileName || 'model.rbxm',
            contentType: 'model/x-rbxm'
        });

        // ========== KIRIM KE ROBLOX ==========
        console.log('⏳ Sending to Roblox API...');
        
        const response = await fetch('https://apis.roblox.com/cloud/v2/assets', {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                ...form.getHeaders()
            },
            body: form
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Roblox API error:', data);
            throw new Error(data.message || `Roblox API error: ${response.status}`);
        }

        console.log(`✅ Upload success! Asset ID: ${data.assetId}`);
        
        res.status(200).json({
            success: true,
            assetId: data.assetId,
            message: 'Model berhasil diupload!'
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
