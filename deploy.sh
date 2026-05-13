#!/bin/bash
set -e
npm run build
rsync -avz --delete dist/ tempo2:www/ --exclude='.well-known'
echo "Deploy completado"
