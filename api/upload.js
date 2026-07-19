// ============================================================
// UPLOAD PROXY UNTUK VERCEL (FIXED - RESPON HANDLER)
// ============================================================

const FormData = require('form-data');
const fetch = require('node-fetch');

// ========== 🔑 API KEY DAN CREATOR ID ==========
const API_KEY = "0IdRZYmd30Ow/GuvH4Di2+qR8b3c/1Qo4h5vAj2K56tuedzmZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SWpCSlpGSmFXVzFrTXpCUGR5OUhkWFpJTkVScE1pdHhVamhpTTJNdk1WRnZOR2cxZGtGcU1rczFOblIxWldSNmJTSXNJbTkzYm1WeVNXUWlPaUk0TXpnd05EZ3pNRGs0SWl3aVpYaHdJam94TnpnME5EWTNOemcyTENKcFlYUWlPakUzT0RRME5qUXhPRFlzSW01aVppSTZNVGM0TkRRMk5ERTRObjAuRXJJcE1MZmdFVG9DRTNHeFh5TDMwRVlFMmQ5c1lJS2pyWkpVTEg5eU5GZ1BYcmMwY3ZVWW5RbmtsR0tmS0V1emVwS0hjc3IwSHh5QWZpTE1RRlNmcG50YmlkV1d2WDZYZmtVX05adVF2TDN0NXZ5ZUx2MktMWHQtWGpfOWVWVjBVTC0tNXY0Z01IQjc0VjR5QXJaZ2hJRUMxbHRsWFdfRVdTREhWNmI1dV9iZDQ2a2F2d09VcUQyMDBfT0d4Y0xRZVZTd2pDb2ZBdmNDdFljMXZ2TVF6LUY5bWJKX3BUektESnVYNWNERXoyTjI5VXp4MGxnVG1DRmhHQS0ybVBrTUl6NUFyUVdLNUwyR19iMktDa1E5Z215QWQ2TjlsMWxwbUJ2N0lubGFremFGSHVTZHhyVHR3UFNsSjZQZDFFUkFSZUVUNktDTkNJSGtBbjlsYWhVcG1n";
const CREATOR_ID = 8380483098;
const CREATOR_TYPE = "user";

// ============================================================

export default async function handler(req, res) {
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

        console.log('⏳ Sending to Roblox API...');

        // ========== KIRIM KE ROBLOX ==========
        const response = await fetch('https://apis.roblox.com/cloud/v2/assets', {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                ...form.getHeaders()
            },
            body: form
        });

        const data = await response.json();

        console.log('📄 Raw Response:', JSON.stringify(data));

        // ========== PROSES RESPONSE ==========
        if (!response.ok) {
            console.error('Roblox API error:', data);
            throw new Error(data.message || `Roblox API error: ${response.status}`);
        }

        // Cek berbagai kemungkinan format response
        let assetId = null;
        
        if (data && data.assetId) {
            assetId = data.assetId;
        } else if (data && data.data && data.data.assetId) {
            assetId = data.data.assetId;
        } else if (data && data.id) {
            assetId = data.id;
        } else if (data && data.operationId) {
            // Untuk async upload
            console.log('⏳ Async upload, operationId:', data.operationId);
            // Polling untuk hasil
            const result = await pollOperation(data.operationId);
            if (result && result.assetId) {
                assetId = result.assetId;
            }
        }

        if (assetId) {
            console.log(`✅ Upload success! Asset ID: ${assetId}`);
            res.status(200).json({
                success: true,
                assetId: assetId,
                message: 'Model berhasil diupload!'
            });
        } else {
            // Jika berhasil tapi tidak ada assetId (seperti response {"errors":[{"code":0,"message":""}]})
            if (data.errors && data.errors[0] && data.errors[0].code === 0) {
                console.log('⚠️ Upload sukses tapi tidak ada assetId di response. Coba cek di Creator Dashboard.');
                res.status(200).json({
                    success: true,
                    assetId: null,
                    message: 'Upload berhasil! Cek asset di Creator Dashboard.',
                    rawResponse: data
                });
            } else {
                throw new Error('Tidak ada assetId dalam response: ' + JSON.stringify(data));
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}

// ========== FUNGSI POLLING UNTUK ASYNC UPLOAD ==========
async function pollOperation(operationId, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const response = await fetch(`https://apis.roblox.com/cloud/v2/operations/${operationId}`, {
            headers: {
                'x-api-key': API_KEY
            }
        });
        
        const data = await response.json();
        
        if (data && data.done) {
            return data.response || data.result;
        }
    }
    return null;
}
