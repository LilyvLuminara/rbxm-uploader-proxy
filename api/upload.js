// ============================================================
// UPLOAD PROXY UNTUK VERCEL (FIX METHOD NOT ALLOWED)
// ============================================================

const API_KEY = "IxxHZgbWeUKnNnHcKbujDceXSM+oHzQmZt5utefCBpdAIFt6ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SWtsNGVFaGFaMkpYWlZWTGJrNXVTR05MWW5WcVJHTmxXRk5OSzI5SWVsRnRXblExZFhSbFprTkNjR1JCU1VaME5pSXNJbTkzYm1WeVNXUWlPaUk0TXpnd05EZ3pNRGs0SWl3aVpYaHdJam94TnpnME5EVTVOamsxTENKcFlYUWlPakUzT0RRME5UWXdPVFVzSW01aVppSTZNVGM0TkRRMU5qQTVOWDAuQXBMM2pCV190OVpKMnRHOEZyaWF4aEhvVU9PRmdkd3pNZE9GMG1lcGVsaHdadVZpZTdhZjIwaUMyRVppQ0Nvd2dQcVRvUEtWMERud2pxRG4yLU43Ny1oaHJfeDVYLWljOFJWS1ZiaEVVU2laS3J0a21QVHowQWpKSkwtYkg5UjdNMWU0dHNaVW4wQUZEX2ZKQTY5bndqakw4QXE5aWJZUkEtMGpJZVVUcXhrekZiRFloaFRTeWYtajdBXy1qSFlRcm95b0pCMEItS2c4dkx0Zzd4SHhkQUtVV0g5ZnM3QkxSaU5zZFFveWJraFpnd19BZFlUWHoxeW9OVlNxQWZZRkNKSHNqTkF2OEJUd1M1aFM3Mm9ZeDlNTzlDV1BDbGw5akcxT200U1RrMnIyV2lSbjhWNzFMbkVPWkI4ZVhsTkxtQXdnSFREb0NCSG9sLWtWYXlUWUt3";

const CREATOR_ID = 8380483098;
const CREATOR_TYPE = "user";

// ============================================================

export default async function handler(req, res) {
    // ========== 1. CORS HEADERS (WAJIB!) ==========
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // ========== 2. HANDLE OPTIONS (Preflight) ==========
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ========== 3. HANDLE GET (Test) ==========
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'OK',
            message: 'Proxy running! Use POST to upload.',
            creatorId: CREATOR_ID
        });
    }

    // ========== 4. HANDLE POST ==========
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method Not Allowed',
            message: 'Use POST for upload or GET for testing'
        });
    }

    try {
        // ========== 5. AMBIL DATA ==========
        const { fileData, fileName, apiKey, creatorId, creatorType } = req.body;

        if (!fileData) {
            return res.status(400).json({ 
                success: false,
                error: 'fileData is required' 
            });
        }

        // Gunakan data dari request atau fallback ke konfigurasi
        const finalApiKey = apiKey || API_KEY;
        const finalCreatorId = creatorId || CREATOR_ID;
        const finalCreatorType = creatorType || CREATOR_TYPE;

        console.log(`📤 Uploading: ${fileName || 'model.rbxm'}`);
        console.log(`👤 Creator: ${finalCreatorType} ${finalCreatorId}`);

        // ========== 6. KONVERSI FILE ==========
        const fileBuffer = Buffer.from(fileData, 'base64');

        if (fileBuffer.length < 10) {
            return res.status(400).json({ 
                success: false,
                error: 'File terlalu kecil atau corrupt.' 
            });
        }

        // ========== 7. BUILD FORM DATA ==========
        const formData = new FormData();

        const assetMetadata = {
            creator: {
                type: finalCreatorType,
                id: finalCreatorId
            },
            assetType: 'Model',
            displayName: fileName || `Model_${Date.now()}`,
            description: 'Uploaded from Delta via Vercel Proxy'
        };
        formData.append('request', JSON.stringify(assetMetadata));
        formData.append('fileContent', fileBuffer, fileName || 'model.rbxm');

        // ========== 8. KIRIM KE ROBLOX ==========
        const response = await fetch('https://apis.roblox.com/cloud/v2/assets', {
            method: 'POST',
            headers: {
                'x-api-key': finalApiKey,
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Roblox API error:', data);
            return res.status(response.status).json({
                success: false,
                error: data.message || `Roblox API error: ${response.status}`,
                details: data
            });
        }

        console.log(`✅ Upload success! Asset ID: ${data.assetId}`);
        return res.status(200).json({
            success: true,
            assetId: data.assetId,
            message: 'Model berhasil diupload!'
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
