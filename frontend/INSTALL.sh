#!/bin/bash

# OTH Housing Platform - Automated Installation Script

echo "🏠 OTH Housing Platform - Installation Script"
echo "=============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Create project directory
PROJECT_NAME="oth-housing-platform"
echo "📁 Creating project: $PROJECT_NAME"

# Create Vite project
npm create vite@latest $PROJECT_NAME -- --template react-ts
cd $PROJECT_NAME

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Install additional packages
echo ""
echo "📦 Installing additional packages..."
npm install react-router@7.13.0 lucide-react sonner
npm install -D tailwindcss@4.1.12 @tailwindcss/vite

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Copy the exported src/ folder to this project"
echo "2. Replace package.json, vite.config.ts, and tsconfig.json with exported versions"
echo "3. Run: npm run dev"
echo ""
echo "Happy coding! 🚀"
