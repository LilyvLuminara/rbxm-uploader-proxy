// ============================================================
// UPLOAD PROXY UNTUK VERCEL - FIXED VERSION
// ============================================================

const FormData = require('form-data');
const fetch = require('node-fetch');

// ========== 🔑 API KEY DARI ENVIRONMENT VARIABLE ==========
const API_KEY = process.env.ROBLOX_API_KEY;
const CREATOR_ID = parseInt(process.env.CREATOR_ID || "8380483098");
const CREATOR_TYPE = process.env.CREATOR_TYPE || "user";

// ============================================================

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method Not Allowed' 
        });
    }

    // Validasi API Key
    if (!API_KEY) {
        console.error('❌ API_KEY tidak ditemukan di environment variables');
        return res.status(500).json({ 
            success: false, 
            error: 'Server configuration error: API_KEY missing' 
        });
    }

    try {
        const { fileData, fileName, assetName, description } = req.body;

        if (!fileData) {
            return res.status(400).json({ 
                success: false, 
                error: 'fileData is required' 
            });
        }

        // Clean Base64
        const cleanBase64 = fileData.replace(/\s/g, '').replace(/\n/g, '').replace(/\r/g, '');
        const fileBuffer = Buffer.from(cleanBase64, 'base64');

        if (fileBuffer.length < 10) {
            return res.status(400).json({ 
                success: false, 
                error: `File terlalu kecil atau corrupt. Size: ${fileBuffer.length} bytes` 
            });
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
            displayName: assetName || fileName || `Model_${Date.now()}`,
            description: description || 'Uploaded from Delta via Vercel Proxy'
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

        // ========== HANDLE RESPONSE ==========
        const responseText = await response.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('❌ Failed to parse JSON:', responseText.substring(0, 500));
            throw new Error(`Invalid JSON response from Roblox: ${responseText.substring(0, 200)}`);
        }

        console.log('📄 Raw Response:', JSON.stringify(data, null, 2));

        // ========== CEK ERROR ==========
        if (!response.ok) {
            const errorMsg = data.message || data.error?.message || data.errors?.[0]?.message || JSON.stringify(data);
            console.error('❌ Roblox API error:', errorMsg);
            throw new Error(`Roblox API error: ${errorMsg}`);
        }

        // ========== PROSES RESPONSE ==========
        let assetId = null;
        let operationId = null;

        // Cek berbagai kemungkinan format response
        if (data && data.assetId) {
            assetId = data.assetId;
        } else if (data && data.data && data.data.assetId) {
            assetId = data.data.assetId;
        } else if (data && data.id) {
            assetId = data.id;
        } else if (data && data.operationId) {
            operationId = data.operationId;
            console.log(`⏳ Async upload, operationId: ${operationId}`);
        }

        // ========== POLLING UNTUK ASYNC UPLOAD ==========
        if (operationId) {
            const result = await pollOperation(operationId);
            
            if (result && result.assetId) {
                assetId = result.assetId;
            } else if (result && result.id) {
                assetId = result.id;
            } else if (result && result.error) {
                throw new Error(`Polling error: ${result.error.message || JSON.stringify(result.error)}`);
            } else if (result && result.response && result.response.assetId) {
                assetId = result.response.assetId;
            }
        }

        // ========== RESPONSE FINAL ==========
        if (assetId) {
            console.log(`✅ Upload success! Asset ID: ${assetId}`);
            return res.status(200).json({
                success: true,
                assetId: assetId.toString(),
                operationId: operationId,
                message: 'Model berhasil diupload!',
                assetUrl: `https://www.roblox.com/library/${assetId}`
            });
        } else {
            // Cek kasus khusus: response kosong tapi sukses
            if (data.errors && data.errors[0] && data.errors[0].code === 0) {
                console.log('⚠️ Upload sukses tapi tidak ada assetId di response.');
                return res.status(200).json({
                    success: true,
                    assetId: null,
                    message: 'Upload berhasil! Cek asset di Creator Dashboard.',
                    rawResponse: data
                });
            }
            
            throw new Error(`Tidak ada assetId dalam response: ${JSON.stringify(data)}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('❌ Stack:', error.stack);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// ========== FUNGSI POLLING UNTUK ASYNC UPLOAD ==========
async function pollOperation(operationId, maxAttempts = 15) {
    console.log(`🔄 Polling operation: ${operationId} (max ${maxAttempts} attempts)`);
    
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
            const response = await fetch(`https://apis.roblox.com/cloud/v2/operations/${operationId}`, {
                headers: {
                    'x-api-key': API_KEY
                }
            });
            
            const data = await response.json();
            console.log(`📊 Polling attempt ${i + 1}/${maxAttempts}:`, JSON.stringify(data, null, 2));
            
            if (data && data.done === true) {
                // Cek apakah ada error
                if (data.error) {
                    throw new Error(`Operation error: ${data.error.message || JSON.stringify(data.error)}`);
                }
                console.log('✅ Operation completed!');
                return data.response || data.result || data;
            }
            
            if (data && data.progress !== undefined) {
                console.log(`⏳ Progress: ${data.progress}%`);
            }
        } catch (error) {
            console.log(`⚠️ Polling attempt ${i + 1} error:`, error.message);
            // Jangan throw, lanjut polling
        }
    }
    
    throw new Error(`Polling timeout after ${maxAttempts} attempts`);
}
