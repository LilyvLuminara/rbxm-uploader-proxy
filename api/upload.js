// ============================================================
// UPLOAD PROXY + POLLING OTOMATIS (Vercel)
// ============================================================

const FormData = require('form-data');
const fetch = require('node-fetch');

// ========== 🔑 KONFIGURASI ==========
const API_KEY = process.env.ROBLOX_API_KEY || "0IdRZYmd30Ow/GuvH4Di2+qR8b3c/1Qo4h5vAj2K56tuedzmZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SWpCSlpGSmFXVzFrTXpCUGR5OUhkWFpJTkVScE1pdHhVamhpTTJNdk1WRnZOR2cxZGtGcU1rczFOblIxWldSNmJTSXNJbTkzYm1WeVNXUWlPaUk0TXpnd05EZ3pNRGs0SWl3aVpYaHdJam94TnpnME5EWTNOemcyTENKcFlYUWlPakUzT0RRME5qUXhPRFlzSW01aVppSTZNVGM0TkRRMk5ERTRObjAuRXJJcE1MZmdFVG9DRTNHeFh5TDMwRVlFMmQ5c1lJS2pyWkpVTEg5eU5GZ1BYcmMwY3ZVWW5RbmtsR0tmS0V1emVwS0hjc3IwSHh5QWZpTE1RRlNmcG50YmlkV1d2WDZYZmtVX05adVF2TDN0NXZ5ZUx2MktMWHQtWGpfOWVWVjBVTC0tNXY0Z01IQjc0VjR5QXJaZ2hJRUMxbHRsWFdfRVdTREhWNmI1dV9iZDQ2a2F2d09VcUQyMDBfT0d4Y0xRZVZTd2pDb2ZBdmNDdFljMXZ2TVF6LUY5bWJKX3BUektESnVYNWNERXoyTjI5VXp4MGxnVG1DRmhHQS0ybVBrTUl6NUFyUVdLNUwyR19iMktDa1E5Z215QWQ2TjlsMWxwbUJ2N0lubGFremFGSHVTZHhyVHR3UFNsSjZQZDFFUkFSZUVUNktDTkNJSGtBbjlsYWhVcG1n";
const CREATOR_ID = parseInt(process.env.CREATOR_ID || "8380483098");
const CREATOR_TYPE = process.env.CREATOR_TYPE || "user";

// ========== FUNGSI POLLING ==========
async function pollOperation(operationId, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        console.log(`⏳ Polling attempt ${i + 1}/${maxAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const response = await fetch(`https://apis.roblox.com/cloud/v2/operations/${operationId}`, {
                headers: { 'x-api-key': API_KEY }
            });

            const data = await response.json();
            console.log(`📊 Polling response: ${JSON.stringify(data)}`);

            if (data && data.done === true) {
                if (data.response && data.response.assetId) {
                    return data.response.assetId;
                }
                if (data.result && data.result.assetId) {
                    return data.result.assetId;
                }
                if (data.assetId) {
                    return data.assetId;
                }
                // Cek error
                if (data.errors && data.errors.length > 0) {
                    throw new Error(data.errors[0].message || 'Operation failed');
                }
            }
        } catch (e) {
            console.error('Polling error:', e.message);
            // Lanjut polling
        }
    }
    return null;
}

// ========== HANDLER UTAMA ==========
export default async function handler(req, res) {
    // CORS
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
        const { fileData, fileName } = req.body;

        if (!fileData) {
            return res.status(400).json({ error: 'fileData is required' });
        }

        // Clean Base64
        const cleanBase64 = fileData.replace(/\s/g, '').replace(/\n/g, '').replace(/\r/g, '');
        const fileBuffer = Buffer.from(cleanBase64, 'base64');

        if (fileBuffer.length < 10) {
            return res.status(400).json({ error: `File terlalu kecil: ${fileBuffer.length} bytes` });
        }

        console.log(`📤 Uploading: ${fileName || 'model.rbxm'}`);
        console.log(`📦 Size: ${fileBuffer.length} bytes`);
        console.log(`👤 Creator: ${CREATOR_TYPE} ${CREATOR_ID}`);

        // ========== STEP 1: UPLOAD ==========
        const form = new FormData();
        const assetMetadata = {
            creator: { type: CREATOR_TYPE, id: CREATOR_ID },
            assetType: 'Model',
            displayName: fileName || `Model_${Date.now()}`,
            description: 'Uploaded from Delta via Vercel Proxy'
        };

        form.append('request', JSON.stringify(assetMetadata));
        form.append('fileContent', fileBuffer, {
            filename: fileName || 'model.rbxm',
            contentType: 'model/x-rbxm'
        });

        const uploadResponse = await fetch('https://apis.roblox.com/cloud/v2/assets', {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                ...form.getHeaders()
            },
            body: form
        });

        const uploadData = await uploadResponse.json();
        console.log('📄 Upload response:', JSON.stringify(uploadData));

        if (!uploadResponse.ok) {
            throw new Error(uploadData.message || `Roblox API error: ${uploadResponse.status}`);
        }

        // ========== STEP 2: CEK APAKAH ADA ASSET ID LANGSUNG ==========
        if (uploadData.assetId) {
            console.log(`✅ Asset ID langsung: ${uploadData.assetId}`);
            return res.status(200).json({
                success: true,
                assetId: uploadData.assetId,
                message: 'Upload berhasil!'
            });
        }

        // ========== STEP 3: CEK OPERATION ID (POLLING) ==========
        if (uploadData.operationId) {
            console.log(`⏳ Operation ID: ${uploadData.operationId}, mulai polling...`);

            // Polling sampai selesai
            const assetId = await pollOperation(uploadData.operationId);

            if (assetId) {
                console.log(`✅ Asset ID dari polling: ${assetId}`);
                return res.status(200).json({
                    success: true,
                    assetId: assetId,
                    operationId: uploadData.operationId,
                    message: 'Upload berhasil! (via polling)'
                });
            } else {
                return res.status(202).json({
                    success: false,
                    operationId: uploadData.operationId,
                    message: 'Upload masih diproses, coba polling manual nanti.'
                });
            }
        }

        // ========== STEP 4: FALLBACK ==========
        return res.status(200).json({
            success: true,
            rawResponse: uploadData,
            message: 'Upload berhasil! Cek asset di Creator Dashboard.'
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
