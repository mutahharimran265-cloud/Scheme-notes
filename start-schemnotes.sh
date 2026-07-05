#!/usr/bin/env sh
# SchemNotes launcher for macOS / Linux — same guarantees as START-SCHEMNOTES.bat:
# Node check, port check, dependency + migration failure detection, DB backup
# before migrations, and the browser opens only once the server responds.
cd "$(dirname "$0")" || exit 1

echo "============================================"
echo "   SchemNotes - local schematic review"
echo "============================================"
echo ""

# --- 1. Node.js installed? ---
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js was not found on this computer."
  echo ""
  echo "        SchemNotes needs Node.js to run. Install the LTS version"
  echo "        from https://nodejs.org and then run this launcher again."
  exit 1
fi
echo "[ok] Node.js $(node --version) found."

# --- 2. Port 3000 free? ---
if ! node -e "const s=require('net').createServer();s.once('error',()=>process.exit(1));s.once('listening',()=>s.close(()=>process.exit(0)));s.listen(3000,'127.0.0.1')" >/dev/null 2>&1; then
  echo "[ERROR] Port 3000 is already in use."
  echo ""
  echo "        SchemNotes may already be running - check http://localhost:3000."
  echo "        Otherwise, close the app using port 3000 and run this again."
  exit 1
fi
echo "[ok] Port 3000 is free."

# --- 3. Local .env ---
if [ ! -f ".env" ]; then
  cp ".env.example" ".env"
  echo "[ok] Created .env with local defaults."
fi

# --- 4. Dependencies ---
if [ ! -d "node_modules" ]; then
  echo "[..] First run: installing dependencies - this can take a few minutes..."
  if ! npm install; then
    echo ""
    echo "[ERROR] Dependency install failed - see the messages above."
    echo "        Check your internet connection, then run this launcher again."
    exit 1
  fi
fi

# --- 5. Back up the database, then apply migrations ---
if ! node scripts/backup-db.mjs pre-migrate; then
  echo "[ERROR] Could not back up the database - stopping to keep your data safe."
  exit 1
fi
if ! npx prisma migrate deploy; then
  echo ""
  echo "[ERROR] Database setup failed - see the messages above."
  echo "        Your previous database is safe in prisma/backups/."
  exit 1
fi

# --- 6. Start the server; open the browser once it actually responds ---
echo "[ok] Starting the server - the browser will open when it is ready."
echo "     Press Ctrl+C to stop SchemNotes."
echo ""
node scripts/open-when-ready.mjs "http://localhost:3000" &
OPENER_PID=$!
npm run dev
kill "$OPENER_PID" 2>/dev/null
