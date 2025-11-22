#!/bin/bash
# Vosk Model Installation Script for Raspberry Pi 5
# This script downloads and installs Vosk speech recognition models

echo "=========================================="
echo "Vosk Model Installation for Raspberry Pi 5"
echo "=========================================="
echo ""

# Check available disk space
available_space=$(df -h ~ | awk 'NR==2 {print $4}')
echo "Available disk space: $available_space"
echo ""

# Ask which model to install
echo "Which model would you like to install?"
echo "1) Small model (40MB) - Recommended for RPi 5, good accuracy"
echo "2) Large model (1.8GB) - Better accuracy, requires 8GB RAM RPi 5"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        MODEL_URL="https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
        MODEL_NAME="vosk-model-small-en-us-0.15"
        echo "Installing small model..."
        ;;
    2)
        MODEL_URL="https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip"
        MODEL_NAME="vosk-model-en-us-0.22"
        echo "Installing large model (this may take a while)..."
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Change to home directory
cd ~

# Download the model
echo "Downloading model..."
if command -v wget &> /dev/null; then
    wget "$MODEL_URL"
elif command -v curl &> /dev/null; then
    curl -L -o "${MODEL_NAME}.zip" "$MODEL_URL"
else
    echo "Error: Neither wget nor curl is installed."
    exit 1
fi

# Check if download was successful
if [ ! -f "${MODEL_NAME}.zip" ]; then
    echo "Error: Download failed."
    exit 1
fi

# Unzip the model
echo "Extracting model..."
unzip -q "${MODEL_NAME}.zip"

# Remove zip file to save space
rm "${MODEL_NAME}.zip"

# Verify installation
if [ -d "$MODEL_NAME" ]; then
    echo ""
    echo "=========================================="
    echo "Installation successful!"
    echo "=========================================="
    echo "Model installed at: ~/$MODEL_NAME"
    echo ""
    echo "The app.py will automatically detect and use this model."
    echo ""
    du -sh ~/$MODEL_NAME
else
    echo "Error: Model extraction failed."
    exit 1
fi

