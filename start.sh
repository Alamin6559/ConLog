#!/bin/bash
# Start Vite dev server in background
npx vite &
VITE_PID=$!

# Wait for Vite to be ready
echo "Waiting for Vite..."
sleep 3

# Launch Electron pointing to the already-built dist-electron/main.js
NODE_ENV=development npx electron .

# Cleanup
kill $VITE_PID
