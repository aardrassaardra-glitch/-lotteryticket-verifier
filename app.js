// Gemini API Key - REPLACE with yours if needed
        const GEMINI_API_KEY = "AIzaSyBm91l25FQFfnEyfFEu6-nNRlCxvXeauqs";
        
        // DOM Elements
        const uploadBox = document.getElementById('uploadBox');
        const imageInput = document.getElementById('imageInput');
        const fileName = document.getElementById('fileName');
        const checkBtn = document.getElementById('checkBtn');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');
        const resultDiv = document.getElementById('result');
        const apiResultDiv = document.getElementById('apiResult');
        
        // Current selected file
        let selectedFile = null;
        
        console.log("🚀 App starting...");
        
        // File upload handling
        uploadBox.addEventListener('click', () => {
            console.log("📁 Upload area clicked");
            imageInput.click();
        });
        
        imageInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                selectedFile = e.target.files[0];
                console.log("📄 File selected:", selectedFile.name);
                
                // Update UI
                fileName.innerHTML = `
                    <strong>Selected:</strong> ${selectedFile.name}<br>
                    <small>Size: ${formatBytes(selectedFile.size)} | Type: ${selectedFile.type}</small>
                `;
                fileName.style.display = 'block';
                
                // Enable button
                checkBtn.disabled = false;
                setResult("Ready to analyze. Click 'Check Ticket' to proceed.", "info");
            }
        });
        
        // Check ticket button
        checkBtn.addEventListener('click', async () => {
            if (!selectedFile) {
                setResult("❌ Please select an image first.", "error");
                return;
            }
            
            console.log("🔍 Starting analysis...");
            
            // Show loading state
            btnText.textContent = "Analyzing...";
            btnSpinner.style.display = 'inline-block';
            checkBtn.disabled = true;
            setResult("⏳ Analyzing ticket image... This may take 10-20 seconds.", "loading");
            
            try {
                // Convert image to base64
                const base64Image = await toBase64(selectedFile);
                const imageData = base64Image.split(',')[1];
                
                console.log("🔄 Calling Gemini API...");
                
                // Try multiple endpoints
                const endpoints = [
                    "gemini-2.5-flash",
                    "gemini-2.0-flash", 
                    "gemini-2.5-pro"
                ];
                
                let lastError = null;
                
                for (const model of endpoints) {
                    try {
                        console.log(`Trying model: ${model}`);
                        
                        const response = await fetch(
                            `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify({
                                    contents: [{
                                        parts: [
                                            {
                                                inlineData: {
                                                    mimeType: selectedFile.type,
                                                    data: imageData
                                                }
                                            },
                                            {
                                                text: "Analyze this lottery ticket. Answer format:\n\nVERDICT: [REAL or FAKE]\n\nREASONS: [2-3 brief points]\n\nCONFIDENCE: [High/Medium/Low]\n\nKeep response under 150 words."
                                            }
                                        ]
                                    }]
                                })
                            }
                        );
                        
                        console.log(`Model ${model} response:`, response.status);
                        
                        if (response.ok) {
                            const data = await response.json();
                            const analysis = data.candidates[0].content.parts[0].text;
                            
                            console.log("✅ Analysis successful!");
                            
                            // Format and display result
                            const formatted = formatAnalysis(analysis);
                            setResult(formatted, "success");
                            
                            // Reset button
                            resetButton();
                            return;
                            
                        } else {
                            const errorData = await response.json();
                            lastError = `Model ${model}: ${errorData.error?.message || response.status}`;
                            console.log(`Model ${model} failed:`, lastError);
                        }
                        
                    } catch (modelError) {
                        lastError = `Model ${model}: ${modelError.message}`;
                        console.log(`Model ${model} error:`, modelError.message);
                        continue;
                    }
                }
                
                // If all models failed
                throw new Error(`All models failed. Last error: ${lastError}`);
                
            } catch (error) {
                console.error("❌ Analysis failed:", error);
                
                let userMessage = `Error: ${error.message}`;
                
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    userMessage = `
                        <strong>❌ Network Error</strong><br><br>
                        Possible causes:<br>
                        1. API key not enabled (enable at console.cloud.google.com)<br>
                        2. No internet connection<br>
                        3. CORS issue (try different browser)<br><br>
                        <button onclick="testAPIKey()" style="background: #2196F3; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                            Test API Connection
                        </button>
                    `;
                } else if (error.message.includes('403')) {
                    userMessage = "❌ API Key rejected. Enable Gemini API in Google Cloud Console.";
                } else if (error.message.includes('429')) {
                    userMessage = "❌ Rate limit exceeded. Try again in a minute.";
                }
                
                setResult(userMessage, "error");
                
            } finally {
                resetButton();
            }
        });
        
        // Test API key function
        async function testAPIKey() {
            apiResultDiv.innerHTML = "<div style='color: #666;'>Testing API key...</div>";
            
            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`,
                    {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json'
                        }
                    }
                );
                
                if (response.ok) {
                    const data = await response.json();
                    const models = data.models || [];
                    const geminiModels = models.filter(m => m.name.includes('gemini'));
                    
                    apiResultDiv.innerHTML = `
                        <div style="color: #4CAF50; background: #e8f5e9; padding: 10px; border-radius: 5px;">
                            <strong>✅ API KEY WORKS!</strong><br>
                            Found ${geminiModels.length} Gemini models<br>
                            Available: ${geminiModels.slice(0, 3).map(m => m.name.replace('models/', '')).join(', ')}
                        </div>
                    `;
                    
                } else {
                    const errorText = await response.text();
                    apiResultDiv.innerHTML = `
                        <div style="color: #f44336; background: #ffebee; padding: 10px; border-radius: 5px;">
                            <strong>❌ API Error ${response.status}</strong><br>
                            ${errorText.substring(0, 200)}...
                        </div>
                    `;
                }
                
            } catch (error) {
                apiResultDiv.innerHTML = `
                    <div style="color: #f44336; background: #ffebee; padding: 10px; border-radius: 5px;">
                        <strong>❌ Network Error</strong><br>
                        ${error.message}<br><br>
                        <strong>Fix:</strong><br>
                        1. Enable Gemini API<br>
                        2. Check billing is set up<br>
                        3. Try in 2-3 minutes
                    </div>
                `;
            }
        }
        
        // Debug info
        function showDebugInfo() {
            const info = `
                <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px;">
                    <strong>Debug Info:</strong><br>
                    URL: ${window.location.href}<br>
                    Protocol: ${window.location.protocol}<br>
                    API Key: ${GEMINI_API_KEY.substring(0, 10)}...<br>
                    Selected File: ${selectedFile ? selectedFile.name : 'None'}<br>
                    Time: ${new Date().toLocaleTimeString()}
                </div>
            `;
            apiResultDiv.innerHTML = info;
        }
        
        // Helper functions
        function toBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
        
        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        function setResult(message, type = "info") {
            resultDiv.innerHTML = message;
            resultDiv.className = "";
            
            if (type === "success") {
                resultDiv.classList.add("result-success");
            } else if (type === "error") {
                resultDiv.classList.add("result-error");
            } else if (type === "loading") {
                resultDiv.classList.add("result-loading");
            }
        }
        
        function formatAnalysis(text) {
            let formatted = text
                .replace(/\n/g, '<br>')
                .replace(/(VERDICT:|REASONS:|CONFIDENCE:)/gi, '<strong>$1</strong>')
                .replace(/\b(REAL)\b/gi, '<span style="color: #4CAF50; font-weight: bold;">$1</span>')
                .replace(/\b(FAKE)\b/gi, '<span style="color: #f44336; font-weight: bold;">$1</span>');
            
            return formatted;
        }
        
        function resetButton() {
            btnText.textContent = "🔍 Check Ticket";
            btnSpinner.style.display = 'none';
            checkBtn.disabled = false;
        }
        
        // Initial test
        console.log("🏁 App loaded successfully");
        testAPIKey(); // Auto-test on load
