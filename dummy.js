	// api-server.js
    const express = require('express');
    const cors = require('cors');
    const app = express();
     
    app.use(express.json());
    app.use(cors());
     
    // Store OTPs temporarily (in production, use a proper database)
    const otpStore = new Map();
     
    // Endpoint to store OTP from website
    app.post('/api/store-otp', (req, res) => {
        const { discord_id, otp } = req.body;
        
        // Store OTP with timestamp
        otpStore.set(discord_id, {
            otp,
            timestamp: Date.now()
        });
        
        res.json({ success: true });
    });
     
    // Endpoint for Discord bot to verify OTP
    app.post('/api/verify-otp', (req, res) => {
        const { discord_id, otp } = req.body;
        
        const storedData = otpStore.get(discord_id);
        
        if (!storedData) {
            return res.json({
                success: false,
                message: 'No OTP found for this user'
            });
        }
        
        // Check if OTP is expired (30 minutes)
        if (Date.now() - storedData.timestamp > 30 * 60 * 1000) {
            otpStore.delete(discord_id);
            return res.json({
                success: false,
                message: 'OTP expired'
            });
        }
        
        // Verify OTP
        if (storedData.otp === otp) {
            otpStore.delete(discord_id); // Remove used OTP
            return res.json({ success: true });
        }
        
        res.json({
            success: false,
            message: 'Invalid OTP'
        });
    });
     
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`API server running on port ${PORT}`);
    });
    