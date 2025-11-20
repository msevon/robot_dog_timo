#!/usr/bin/env python3
"""
Speech to Text Script for Raspberry Pi
Listens to USB microphone and converts speech to text
"""

import speech_recognition as sr
import sys
import time
import os
import subprocess
import warnings

# Suppress ALSA warnings
os.environ['PYTHONWARNINGS'] = 'ignore'
warnings.filterwarnings('ignore')

# Redirect ALSA errors to /dev/null
import contextlib

@contextlib.contextmanager
def suppress_stderr():
    """Context manager to suppress stderr"""
    with open(os.devnull, 'w') as devnull:
        old_stderr = sys.stderr
        sys.stderr = devnull
        try:
            yield
        finally:
            sys.stderr = old_stderr

def check_flac():
    """Check if FLAC is installed"""
    try:
        subprocess.run(['flac', '--version'], 
                      stdout=subprocess.DEVNULL, 
                      stderr=subprocess.DEVNULL, 
                      check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def list_microphones():
    """List all available microphones"""
    r = sr.Recognizer()
    print("Available microphones:")
    # Suppress ALSA warnings when listing microphones
    with suppress_stderr():
        mic_names = sr.Microphone.list_microphone_names()
    for i, microphone_name in enumerate(mic_names):
        print(f"  {i}: {microphone_name}")
    return mic_names

def find_usb_microphone():
    """Find the USB microphone device index"""
    with suppress_stderr():
        microphones = sr.Microphone.list_microphone_names()
    for i, name in enumerate(microphones):
        # Look for USB audio devices or PCM2902
        if 'usb' in name.lower() or 'pcm2902' in name.lower() or 'audio codec' in name.lower():
            return i
    # If not found, return None to use default
    return None

def listen_and_recognize(mic_index=None, language='en-US', energy_threshold=4000, pause_threshold=0.8):
    """
    Continuously listen to microphone and convert speech to text
    
    Args:
        mic_index: Microphone device index (None for default)
        language: Language code for recognition (default: 'en-US')
        energy_threshold: Minimum energy level to consider as speech
        pause_threshold: Seconds of non-speaking audio before phrase ends
    """
    r = sr.Recognizer()
    
    # Adjust for ambient noise and set thresholds
    r.energy_threshold = energy_threshold
    r.pause_threshold = pause_threshold
    r.dynamic_energy_threshold = True
    
    # Find USB microphone if not specified
    if mic_index is None:
        mic_index = find_usb_microphone()
        if mic_index is not None:
            print(f"Using USB microphone: {sr.Microphone.list_microphone_names()[mic_index]}")
        else:
            print("USB microphone not found, using default microphone")
            mic_index = 0
    
    # Use the specified microphone
    with suppress_stderr():
        mic = sr.Microphone(device_index=mic_index)
    
    with mic as source:
        print("Adjusting for ambient noise... Please wait.")
        with suppress_stderr():
            r.adjust_for_ambient_noise(source, duration=1)
        print(f"Listening... (Energy threshold: {r.energy_threshold})")
        print("Say something!")
        print("-" * 50)
        
        while True:
            try:
                # Listen for audio
                with suppress_stderr():
                    audio = r.listen(source, timeout=5, phrase_time_limit=5)
                
                # Try to recognize speech using Google Speech Recognition
                try:
                    text = r.recognize_google(audio, language=language)
                    print(f"Recognized: {text}")
                    print("-" * 50)
                    
                except sr.UnknownValueError:
                    print("Could not understand audio")
                    print("-" * 50)
                    
                except sr.RequestError as e:
                    error_msg = str(e)
                    if 'FLAC' in error_msg or 'flac' in error_msg:
                        print("ERROR: FLAC is required for Google Speech Recognition")
                        print("Please install FLAC by running: sudo apt-get install flac")
                        print("-" * 50)
                    else:
                        print(f"Could not request results from speech recognition service; {e}")
                        print("-" * 50)
                    
            except sr.WaitTimeoutError:
                # Timeout is normal, just continue listening
                continue
                
            except KeyboardInterrupt:
                print("\nStopping...")
                break
                
            except Exception as e:
                error_msg = str(e)
                if 'FLAC' in error_msg or 'flac' in error_msg:
                    print("ERROR: FLAC is required for Google Speech Recognition")
                    print("Please install FLAC by running: sudo apt-get install flac")
                    print("-" * 50)
                else:
                    print(f"Error: {e}")
                time.sleep(1)

def main():
    """Main function"""
    print("=" * 50)
    print("Speech to Text - Raspberry Pi")
    print("=" * 50)
    print()
    
    # Check for FLAC
    if not check_flac():
        print("WARNING: FLAC is not installed!")
        print("Google Speech Recognition requires FLAC for audio conversion.")
        print("Please install it by running: sudo apt-get install flac")
        print()
        response = input("Continue anyway? (y/n): ").strip().lower()
        if response != 'y':
            print("Exiting. Please install FLAC and try again.")
            sys.exit(1)
        print()
    
    # List all microphones
    microphones = list_microphones()
    print()
    
    # Find USB microphone
    usb_mic_index = find_usb_microphone()
    
    if usb_mic_index is not None:
        print(f"Found USB microphone at index {usb_mic_index}")
        print()
        mic_index = usb_mic_index
    else:
        print("USB microphone not automatically detected.")
        print("You can specify a microphone index manually.")
        print()
        try:
            user_input = input("Enter microphone index (or press Enter for default): ").strip()
            if user_input:
                mic_index = int(user_input)
            else:
                mic_index = None
        except (ValueError, KeyboardInterrupt):
            print("Using default microphone")
            mic_index = None
    
    print()
    print("Starting speech recognition...")
    print("Press Ctrl+C to stop")
    print()
    
    # Start listening
    try:
        listen_and_recognize(mic_index=mic_index)
    except KeyboardInterrupt:
        print("\nExiting...")
        sys.exit(0)

if __name__ == "__main__":
    main()

