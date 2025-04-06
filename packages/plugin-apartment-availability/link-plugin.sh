#!/bin/bash

echo "==== Apartment Availability Plugin Setup ===="

# Navigate to the plugin directory
cd "$(dirname "$0")"
PLUGIN_DIR=$(pwd)
echo "Plugin directory: $PLUGIN_DIR"

# Check Eliza version compatibility
echo "Checking Eliza version compatibility..."
if [ -f "../../agent/package.json" ]; then
    ELIZA_VERSION=$(grep -o '"version": *"[^"]*"' ../../agent/package.json | cut -d'"' -f4)
    echo "Detected Eliza version: $ELIZA_VERSION"
    
    # Check if the version is compatible with our plugin
    if [[ "$ELIZA_VERSION" == "0.25.9" ]]; then
        echo "✅ Plugin is designed for Eliza v0.25.9 - compatibility confirmed"
    else
        echo "⚠️ Plugin is designed for Eliza v0.25.9, detected v$ELIZA_VERSION - some adjustments may be needed"
    fi
else
    echo "⚠️ Could not detect Eliza version - assuming compatibility"
fi

# Build the plugin
echo "Building plugin..."
pnpm build

# Check if build succeeded
if [ ! -d "./dist" ]; then
    echo "❌ Build failed: dist directory not found"
    exit 1
fi

# Go to Eliza root directory
cd ../..
ELIZA_DIR=$(pwd)
echo "Eliza directory: $ELIZA_DIR"

# Create node_modules/@elizaos directory if it doesn't exist
mkdir -p "node_modules/@elizaos"
echo "Created directory: node_modules/@elizaos"

# Remove existing link if it exists
if [ -L "node_modules/@elizaos/plugin-apartment-availability" ]; then
    echo "Removing existing symlink..."
    rm "node_modules/@elizaos/plugin-apartment-availability"
fi

# Create symlink to our plugin
echo "Creating symlink..."
ln -sf "$PLUGIN_DIR" "node_modules/@elizaos/plugin-apartment-availability"

# Verify the symlink was created properly
if [ -L "node_modules/@elizaos/plugin-apartment-availability" ]; then
    LINK_TARGET=$(readlink "node_modules/@elizaos/plugin-apartment-availability")
    echo "✅ Plugin linked successfully: $LINK_TARGET"
else
    echo "❌ Failed to create symlink"
    exit 1
fi

# Run pnpm install to update dependencies
echo "Running pnpm install..."
pnpm install --no-frozen-lockfile

# Test the plugin with node
echo "Testing plugin import..."
node "$PLUGIN_DIR/test-plugin.js"

# Run compatibility test if available
if [ -f "$PLUGIN_DIR/tests/compatibility.test.js" ]; then
    echo "Running compatibility tests..."
    node "$PLUGIN_DIR/tests/compatibility.test.js"
fi

echo "==== Setup Complete ===="
echo "You can now restart Eliza to use the plugin." 