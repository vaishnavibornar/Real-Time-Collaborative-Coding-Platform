# Real-Time Collaborative Coding Platform 🚀

A production-ready, highly interactive collaborative IDE that supports real-time multi-user editing, custom room workspaces, file management, active selection synchronization, voice/video calls via WebRTC, and persistent data storage.

---

## 🌟 Key Features

*   **Real-Time Collaborative Editing**: Multiple users in a room can edit code files simultaneously. Powered by **Monaco Editor** and **Socket.io**.
*   **VS Code-Style Sidebar Explorer**: Add, select, delete, and inline rename files inside the workspace.
*   **Synced Active Selection & Language**: Switching the active file or changing the extension dynamically switches syntax highlighting and highlights the selection for all room participants.
*   **MongoDB Persistence**: Seamless database integration via Mongoose to store rooms and file structures.
*   **Debounced Auto-Save & Disconnect Auto-Flush**: Saves edits periodically with a 2-second debounce to reduce database load. Unsaved buffer changes automatically flush when a client disconnects or leaves.
*   **Zero-Config In-Memory Fallback**: No MongoDB running locally? No problem! The server automatically falls back to an in-memory database for local testing and developer previews.
*   **Real-Time Chat Panel**: Built-in chat to collaborate and communicate in real time.
*   **WebRTC Peer Connection**: Integrated signaling handlers to enable WebRTC audio and video calling.
*   **🔒 Secure Workspaces & Roles**: Room creators can set rooms to `public` or `private`. Users join as `OWNER`, `EDITOR`, or `VIEWER`. Includes invite-by-email systems and dynamic room membership management.
*   **📝 Production Application Logging**: Centralized, structured JSON file logging (`logs/combined.log`, `logs/error.log`) combined with clean, human-readable console logging powered by **Winston** & **Morgan** for HTTP tracking.
*   **🛡️ Graceful Client Error Recovery**: Robust 404 screen when rooms do not exist, preventing UI rendering lockups.

---

## 🔒 Security & Role Permissions

The platform enforces JWT authentication across REST API routes and Socket.io handshakes.

*   **Access Control**: Private rooms restrict access. Guest or unapproved users are redirected to a secure "Join Gate" where they can submit access requests.
*   **User Roles**:
    *   `OWNER`: Complete control over the room, including updating visibility (public/private), promoting/demoting members, kicking users, accepting join requests, and deleting the room.
    *   `EDITOR`: Full read-write permission for workspace files.
    *   `VIEWER`: Read-only access to files; restricted from creating, renaming, deleting, or editing files.

---

## 📝 Logging System

The backend employs a production-grade logging architecture built on Winston and Morgan:
*   **Combined Logs**: Written in structured JSON to `server/logs/combined.log` (level `info`).
*   **Error Logs**: Written to `server/logs/error.log` (level `error`).
*   **Console logs**: Colorized and formatted cleanly for development.
*   **HTTP Request Logs**: Morgan streams status codes, HTTP methods, and response latencies directly into Winston.

---

## 🛠️ Technology Stack

### Frontend
*   **Next.js** (App Router)
*   **React**
*   **Monaco Editor** (via `@monaco-editor/react`)
*   **Socket.io Client**
*   **Tailwind CSS** (Premium styling and layout)

### Backend
*   **Node.js**
*   **Express**
*   **Socket.io Server**
*   **MongoDB & Mongoose** (with In-Memory backup)
*   **Winston & Morgan** (Logging stack)

---

## 📂 Project Structure

```
Real-Time-Collaborative-Coding-Platform/
├── client/                     # Next.js Frontend
│   ├── app/                    # Routing & Pages
│   │   ├── room/[roomId]/      # Main workspace layout page
│   │   └── page.jsx            # Landing / Join room page
│   ├── components/             # React UI components (Sidebar, Chat, etc.)
│   ├── hooks/                  # Custom React hooks (useWorkspace, useFiles)
│   └── lib/                    # Configuration / Socket Client (api.js, socket.js)
├── server/                     # Express & Socket.io Backend
│   ├── logs/                   # Winston log files (gitignored)
│   ├── src/
│   │   ├── config/             # DB & server initialization
│   │   ├── models/             # Mongoose schemas (Room, File, RoomMember, User, Invitation)
│   │   ├── routes/             # REST APIs (Room CRUD, File CRUD, Auth, Invitations)
│   │   ├── services/           # Workspace & debounced auto-save logic
│   │   ├── socket/             # Real-time event handlers
│   │   └── utils/              # Winston log configuration
│   └── .env                    # Environment variables
└── README.md                   # Project documentation
```

---

## 🚀 Setup & Installation

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18+ recommended)
*   [MongoDB](https://www.mongodb.com/) (Optional: the system automatically boots in-memory if MongoDB is not detected)

### 1. Server Configuration
1. Navigate to the server folder:
    ```bash
    cd server
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Create a `.env` file in the `server` directory:
    ```env
    PORT=4000
    MONGODB_URI=mongodb://127.0.0.1:27017/collaborative-editor
    JWT_SECRET=your_jwt_secret_here
    CLIENT_URL=http://localhost:3000
    ```
4. Start the server in development mode:
    ```bash
    npm run dev
    ```

### 2. Client Configuration
1. Navigate to the client folder:
    ```bash
    cd ../client
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Create a `.env.local` file in the `client` directory:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:4000
    ```
4. Start the Next.js development server:
    ```bash
    npm run dev
    ```

Open `http://localhost:3000` in multiple browser tabs, sign up/login, and start collaborating!

---

## 🌐 Production Deployment (e.g. Vercel & Render)

For full deployment, follow these setup requirements to ensure secure client-backend communication:

### 1. Backend Deployment (Render, Heroku, or Railway)
Deploy the Node.js/Express server to a persistent provider. Provide the following environment variables:
*   `PORT`: Port for the server to listen on.
*   `MONGODB_URI`: Production MongoDB connection string.
*   `JWT_SECRET`: Secure cryptographic token secret.
*   `CLIENT_URL`: URL of the deployed frontend client (e.g., `https://cosphere-client.vercel.app`). This is used to bypass CORS blocks.

### 2. Frontend Deployment (Vercel)
Deploy the Next.js frontend to Vercel. Set the following environment variables in the Vercel dashboard:
*   `NEXT_PUBLIC_API_URL`: URL of the deployed backend server (e.g., `https://cosphere-backend.onrender.com`).