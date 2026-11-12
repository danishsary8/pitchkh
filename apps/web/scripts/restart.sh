#!/usr/bin/env bash
# Restarts the production server on :3000 (after `pnpm build`).
pkill -f "next start" >/dev/null 2>&1; pkill -f "next-server" >/dev/null 2>&1; sleep 1
cd "$(dirname "$0")/.." && (PORT=3000 nohup pnpm start > /tmp/pitchkh-server.log 2>&1 &)
for i in $(seq 1 20); do curl -s -o /dev/null http://localhost:3000/en && echo "server up" && exit 0; sleep 1; done; echo "server failed"; exit 1
