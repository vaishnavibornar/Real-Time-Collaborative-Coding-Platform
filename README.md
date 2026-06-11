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
│   └── lib/                    # Configuration / Socket Client
├── server/                     # Express & Socket.io Backend
│   ├── src/
│   │   ├── config/             # DB & server initialization
│   │   ├── models/             # Mongoose schemas (Room, File)
│   │   ├── routes/             # REST APIs (Room CRUD, File CRUD)
│   │   ├── services/           # Workspace & debounced auto-save logic
│   │   └── socket/             # Real-time event handlers
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
3. Start the Next.js development server:
    ```bash
    npm run dev
    ```

Open `http://localhost:3000` in multiple browser tabs, enter a room ID, and start collaborating!

---

## 💾 Workspace Persistence & Fallback Mode

This application implements a smart persistence layer:
*   **MongoDB Mode**: If a MongoDB database is running at `MONGODB_URI`, the server establishes a connection. Rooms and files are persistent and survive server restarts.
*   **In-Memory Fallback Mode**: If MongoDB is not reachable (e.g. `ECONNREFUSED`), the server displays a warning and enables an **In-Memory fallback store**. All workspace operations (adding files, editing code, renaming, deleting, collaborative syncing) work identically, but data is cleared when the backend process restarts.