#!/bin/bash

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Auto-switch Node.js version if .nvmrc exists
auto_switch_node() {
  if [[ -f .nvmrc ]]; then
    nvm use
  fi
}

# Call it when entering the directory
auto_switch_node

# Rebuild native modules if needed
if [[ ! -f "node_modules/.rebuild-done" ]]; then
  echo "Rebuilding native modules..."
  pnpm rebuild
  touch node_modules/.rebuild-done
fi

# Set up any project-specific environment variables
export NODE_ENV=${NODE_ENV:-development}

echo "Development environment set up successfully!" 