// ============================================================
// UPLOAD PROXY UNTUK VERCEL
// ============================================================

const FormData = require('form-data');
const fetch = require('node-fetch');

const API_KEY = "ETxYe1E200yFSfSNtdvqfHKofOGRC4C+aDQKd9IzcUB1nqlHZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SWtWVWVGbGxNVVV5TURCNVJsTm1VMDUwWkhaeFpraExiMlpQUjFKRE5FTXJZVVJSUzJRNVNYcGpWVUl4Ym5Gc1NDSXNJbTkzYm1WeVNXUWlPaUk0TXpnd05EZ3pNRGs0SWl3aVpYaHdJam94TnpnME5EWTJPREEzTENKcFlYUWlPakUzT0RRME5qTXlNRGNzSW01aVppSTZNVGM0TkRRMk16SXdOMzAuS1o2UjR0SGloc1RsWHlldEF4aUo5b3YxOHdVTmRHX2dDTGg2OHllVzVWVm9OYVI0VmlfU093Z3BtOXV2OFpfUXBTVDBYbk1RSDBTYl9CcjhlZ2JSOGxja1gwR0c0OHl0Y3JoS2NMWGxVekFYbkFOcXJMRmluRWRXVXluSF80eDZ4WmJFZ21xUkVwSGFINWdYbVFvVExNOW1tNjFCMzlmUXp2cFRKckYwUnFNU0RNV3MxRFloX25ITDNjcGl5QkFCdmk2WHA0Y09Qd3J2OHFRMk9iOEQweWZheWc3NTM2THkxVXp6REszX0xoOExWQlhhN2FTSlZ6a2dXUXdpaWp1Z094SmRxdkl4cUhUbzdzU0hjdlVQOXN2Rl9YV1plY29nempjNDVtNGozSkIySjc1RDU5MkdKWVpKTXgtYjBKbUZRZkxZN19aTV82MVY2Z2RLZW01bVJB";
const CREATOR_ID = 8380483098;
const CREATOR_TYPE = "user";

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Hanya terima POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { fileData, fileName } = req.body;

        if (!fileData) {
            return res.status(400).json({ error: 'fileData is required' });
        }

        // Bersihkan Base64
        const cleanBase64 = fileData.replace(/\s/g, '').replace(/\n/g, '').replace(/\r/g, '');
        const fileBuffer = Buffer.from(cleanBase64, 'base64');

        if (fileBuffer.length < 10) {
            return res.status(400).json({ error: 'File terlalu kecil atau corrupt. Size: ' + fileBuffer.length });
        }

        console.log(`📤 Uploading: ${fileName || 'model.rbxm'}`);
        console.log(`📦 Size: ${fileBuffer.length} bytes`);
        console.log(`👤 Creator: ${CREATOR_TYPE} ${CREATOR_ID}`);

        // Build FormData
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

        // Kirim ke Roblox
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
