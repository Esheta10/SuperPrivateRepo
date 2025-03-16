//1. Import and Configure Google Sheets API
const { google } = require('googleapis'); // Add this line with your other imports
const keys = require('./credentials/credentials.json');
// Create a JWT client for authentication
const auth = new google.auth.JWT(
  keys.client_email,
  null,
  keys.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);

// Authorize Google Sheets API client
auth.authorize((err) => {
  if (err) {
    console.error('Error authorizing Google Sheets client:', err);
    process.exit(1);
  } else {
    console.log('Connected to Google Sheets API');
  }
});
//2. Create a Function to Update the Google Sheet
async function updateGoogleSheet(email, firstName, lastName, location, careerGoals, otp) {
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID; // Ensure this env variable is set
  // Data row to append: Feel free to adjust the order/columns
    const values = [[email, firstName, lastName, location, careerGoals, otp, new Date().toISOString()]];
  const resource = {
      values,
    };
  try {
      const result = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:G', // Adjust the range as needed (A:G means columns A to G)
        valueInputOption: 'USER_ENTERED',
        resource,
      });
      console.log(`Google Sheet updated: ${result.data.updates.updatedCells} cells appended.`);
    } catch (error) {
      console.error('Error updating Google Sheet:', error);
    }
  }
  

require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// SMTP Configuration
const transporter = nodemailer.createTransport({
    host: "smtpout.secureserver.net", // GoDaddy SMTP server
    port: 465, // SSL port
    secure: true, // Use SSL
    auth: {
        user: process.env.SMTP_USER, // Webmail sender email
        pass: process.env.SMTP_PASS, // Webmail password
    }
});

// Verify SMTP Connection at Startup
transporter.verify((error, success) => {
    if (error) {
        console.error("SMTP Connection Error:", error);
    } else {
        console.log("SMTP Connected Successfully");
    }
});

// Function to Generate a 6-character Alphanumeric OTP
function generateAlphanumericOTP(length = 6) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
        otp += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return otp;
}

// Function to Append Data to CSV
const saveToCSV = (email, firstName, lastName, location, careerGoals, otp) => {
    const csvFilePath = path.join(__dirname, 'email_new_logs.csv');
    const csvData = `${email},${firstName},${lastName},${location},${careerGoals},${otp},${new Date().toISOString()}\n`;
    
    if (!fs.existsSync(csvFilePath)) {
        fs.writeFileSync(csvFilePath, 'Email,First Name,Last Name,Location,Career Goals,OTP,Timestamp\n'); // Add headers if file doesn't exist
    }
    
    fs.appendFileSync(csvFilePath, csvData);
};

// API Route to Send Email
app.post('/send-email', (req, res) => {
    const { email, firstName, lastName, location, careerGoals } = req.body;
  // Generate OTP before using it
    const otp = generateAlphanumericOTP(6);
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Your OTP Code',
      html: `
      <p>Dear <b>${firstName}</b>,</p>
  
      <h2>Welcome to Job Referral Club! 🚀</h2>
  
      <p>We are thrilled to have you join our community, where professionals connect to help each other through employee referrals, resume reviews, and interview preparation.</p>
  
      <p><b>Your One-Time Password (OTP):</b> 
          <span style="font-size: 18px; color: #007bff;"><b>${otp}</b></span>
      </p>
  
      <p><b>Location:</b> ${location}</p>
  
      <p>To get started, we invite you to join our exclusive community on Discord, where you can network with industry professionals, gain valuable insights, and enhance your career opportunities.</p>
  
      <p>
          👉 <b><a href="https://discord.com/invite/6pTzCbsFxP"
          style="font-size: 18px; color: #5865F2; text-decoration: none;">
          Click here to join our Discord community</a></b>.
      </p>
  
      <p><b>Note:</b> This OTP is valid for the next <b>10 minutes</b>. Please use it promptly to complete your registration.</p>
  
      <p>If you did not request this OTP, please ignore this email.</p>
  
      <p>Best regards,<br><b>Job Referral Club Team</b></p>
  `
  
    };
  transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.error("Email Sending Error:", error);
        return res.status(500).json({ message: 'Error sending email', error });
      }
  console.log("Email sent:", info.response);
      saveToCSV(email, firstName, lastName, location, careerGoals, otp); // Save data to CSV
  // Update Google Sheet with the same data
      await updateGoogleSheet(email, firstName, lastName, location, careerGoals, otp);
      
      res.status(200).json({ message: 'Email sent successfully', otp });
    });
  });
  
// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Try using a different port.`);
    } else {
        console.error("Server Error:", err);
    }
});
