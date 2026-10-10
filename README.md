# 📞 Bhupes Calling — Medicare & T65 Call Script Application

An interactive, responsive Progressive Web App (PWA) designed for Medicare / T65 & Life-GBL appointment setting, compliant objection handling, client discovery, and rapid dialer workflow.

---

## 🌟 Key Features

- **Compliant Call Flows:** Dynamic step-by-step scripts for Opening, Reason for Call, Setting Day & Time, Qualifying Questions, and Appointment Confirmation.
- **Objection Handling Matrix:** Quick-pivot rebuttals for "I don't have Medicare", "Not interested", "Already covered", "Busy right now", and more.
- **Client Auto-Fill Dock:** Inline and floating client data cards (first name, last name, lead source, address, and auto-detect Mr./Ms.).
- **Quick Portals Bar:** 1-click access to essential field tools:
  - Zoom Meeting integration
  - Microsoft Copilot M365 AI chat
  - BSPN Portal (`bspn.bankers.com`)
  - CMS & Bankers Life compliance references
- **PWA & Offline Capability:** Local manifest with service worker support for field use.
- **Live Reload Server:** Zero-dependency Node.js HTTP server supporting Server-Sent Events (SSE) live updates.

---

## 🚀 How to Run Locally

### Start Local Server:
```bash
node server.js
```
The server will start on: **`http://localhost:3001`**

Alternatively, simply open `index.html` directly in any modern web browser.

---

## 📋 Technology Stack
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (zero external dependencies)
- **Server:** Node.js HTTP server with Server-Sent Events (SSE)
- **Deployment:** GitHub Pages and Localhost:3001
