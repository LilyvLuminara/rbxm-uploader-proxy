-- ============================================================
-- UPLOAD MODEL LENGKAP UNTUK DELTA
-- ============================================================

local HttpService = game:GetService("HttpService")
local MarketplaceService = game:GetService("MarketplaceService")
local Workspace = game:GetService("Workspace")

-- ========== KONFIGURASI ==========
local PROXY_URL = "https://rbxm-uploader-proxy.vercel.app/api/upload" -- ✅ SUDAH PAKAI INI
local TIMEOUT = 30

-- ============================================================
-- FUNGSI ENCODE
-- ============================================================

local function encodeFileToBase64(filePath)
    local file = io.open(filePath, "rb")
    if not file then
        return nil, "File tidak ditemukan: " .. filePath
    end
    
    local content = file:read("*all")
    file:close()
    
    local b64 = HttpService:Base64Encode(content)
    return b64
end

-- ============================================================
-- FUNGSI UPLOAD
-- ============================================================

local function uploadModel(filePath, assetName, description)
    print("📤 Uploading model...")
    
    local fileData, err = encodeFileToBase64(filePath)
    if not fileData then
        return nil, err
    end
    
    print("📦 File size: " .. #fileData .. " characters (base64)")
    
    local payload = {
        fileData = fileData,
        fileName = "model.rbxm",
        assetName = assetName or "My Model " .. os.date("%Y-%m-%d %H:%M:%S"),
        description = description or "Uploaded from Delta"
    }
    
    local success, response = pcall(function()
        return HttpService:PostAsync(
            PROXY_URL,
            HttpService:JSONEncode(payload),
            Enum.HttpContentType.ApplicationJson,
            false,
            {
                ["Content-Type"] = "application/json"
            }
        )
    end)
    
    if not success then
        return nil, "Network error: " .. tostring(response)
    end
    
    local data = HttpService:JSONDecode(response)
    
    if data.success then
        print("✅ Upload success!")
        print("📌 Asset ID: " .. data.assetId)
        print("🔗 URL: " .. data.assetUrl)
        return data
    else
        return nil, data.error or "Upload failed"
    end
end

-- ============================================================
-- FUNGSI LOAD
-- ============================================================

local function loadAssetFromId(assetId)
    if not assetId then
        return nil, "Asset ID tidak valid"
    end
    
    print("📥 Loading asset: " .. assetId)
    
    local id = tonumber(assetId)
    if not id then
        return nil, "Asset ID harus berupa angka"
    end
    
    local success, result = pcall(function()
        return MarketplaceService:LoadAsset(id)
    end)
    
    if not success then
        return nil, "Gagal load asset: " .. tostring(result)
    end
    
    if not result or not result:IsA("Model") then
        return nil, "Asset bukan model atau tidak valid"
    end
    
    print("✅ Asset loaded successfully!")
    return result
end

local function loadAndParent(assetId, parent)
    parent = parent or Workspace
    
    local model, err = loadAssetFromId(assetId)
    if not model then
        return nil, err
    end
    
    model.Parent = parent
    print("✅ Model placed in " .. parent.Name)
    
    return model
end

-- ============================================================
-- FUNGSI UPLOAD + LOAD OTOMATIS
-- ============================================================

local function uploadAndLoad(filePath, assetName, parent)
    parent = parent or Workspace
    
    print("🚀 Upload and load model...")
    
    local result, err = uploadModel(filePath, assetName)
    if not result then
        return nil, err
    end
    
    print("⏳ Loading model from asset ID:", result.assetId)
    
    local model = loadAndParent(result.assetId, parent)
    if not model then
        return nil, "Failed to load model"
    end
    
    print("✅ Model uploaded and loaded!")
    return {
        assetId = result.assetId,
        model = model
    }
end

-- ============================================================
-- FUNGSI UPLOAD DENGAN RETRY
-- ============================================================

local function uploadWithRetry(filePath, assetName, maxRetries)
    maxRetries = maxRetries or 3
    
    for attempt = 1, maxRetries do
        print(string.format("🔄 Attempt %d/%d", attempt, maxRetries))
        
        local result, err = uploadModel(filePath, assetName)
        
        if result then
            return result
        end
        
        print("⚠️ Attempt " .. attempt .. " failed:", err)
        
        if attempt < maxRetries then
            print("⏳ Waiting 3 seconds before retry...")
            wait(3)
        end
    end
    
    return nil, "All retries failed"
end

-- ============================================================
-- FUNGSI UPLOAD DENGAN PROGRESS
-- ============================================================

local function uploadWithProgress(filePath, assetName, description, progressCallback)
    print("📤 Starting upload...")
    
    local fileData, err = encodeFileToBase64(filePath)
    if not fileData then
        return nil, err
    end
    
    print("📦 Size: " .. #fileData .. " chars")
    
    if progressCallback then
        progressCallback(10, "Encoding complete")
    end
    
    local payload = {
        fileData = fileData,
        fileName = "model.rbxm",
        assetName = assetName or "My Model " .. os.date("%Y-%m-%d %H:%M:%S"),
        description = description or "Uploaded from Delta"
    }
    
    if progressCallback then
        progressCallback(30, "Sending to server...")
    end
    
    local startTime = tick()
    local success, response = pcall(function()
        return HttpService:PostAsync(
            PROXY_URL,
            HttpService:JSONEncode(payload),
            Enum.HttpContentType.ApplicationJson,
            false,
            {
                ["Content-Type"] = "application/json",
                ["Timeout"] = TIMEOUT
            }
        )
    end)
    
    if not success then
        return nil, "Network error: " .. tostring(response)
    end
    
    if progressCallback then
        progressCallback(70, "Processing...")
    end
    
    local data = HttpService:JSONDecode(response)
    
    if data.success then
        if progressCallback then
            progressCallback(100, "Complete!")
        end
        
        local elapsed = math.floor(tick() - startTime)
        print("⏱️ Completed in " .. elapsed .. " seconds")
        print("✅ Asset ID: " .. data.assetId)
        
        return data
    else
        return nil, data.error or "Upload failed"
    end
end

-- ============================================================
-- 🔥 EKSEKUSI: UPLOAD + LOAD OTOMATIS
-- ============================================================

print("========================================")
print("🚀 STARTING UPLOAD + LOAD")
print("========================================")

local result = uploadAndLoad("model.rbxm", "Nama Model")
if result then
    print("========================================")
    print("✅ SUCCESS!")
    print("📌 Asset ID:", result.assetId)
    print("📦 Model:", result.model.Name)
    print("👶 Children:", #result.model:GetChildren())
    print("========================================")
    
    -- Opsional: atur posisi model
    if result.model:IsA("Model") and result.model:FindFirstChild("HumanoidRootPart") then
        result.model:SetPrimaryPartCFrame(CFrame.new(0, 10, 0))
        print("📍 Model positioned at 0, 10, 0")
    end
else
    print("========================================")
    print("❌ FAILED!")
    print("Error:", err)
    print("========================================")
end
