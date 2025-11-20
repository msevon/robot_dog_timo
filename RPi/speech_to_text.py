#!/usr/bin/env python3
"""
Speech to Text Script for Raspberry Pi
Listens to USB microphone and converts speech to text
"""

import speech_recognition as sr
import sys
import time

def list_microphones():
    """List all available microphones"""
    r = sr.Recognizer()
    print("Available microphones:")
    for i, microphone_name in enumerate(sr.Microphone.list_microphone_names()):
        print(f"  {i}: {microphone_name}")
    return sr.Microphone.list_microphone_names()

def find_usb_microphone():
    """Find the USB microphone device index"""
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
    with sr.Microphone(device_index=mic_index) as source:
        print("Adjusting for ambient noise... Please wait.")
        r.adjust_for_ambient_noise(source, duration=1)
        print(f"Listening... (Energy threshold: {r.energy_threshold})")
        print("Say something!")
        print("-" * 50)
        
        while True:
            try:
                # Listen for audio
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
                    print(f"Could not request results from speech recognition service; {e}")
                    print("-" * 50)
                    
            except sr.WaitTimeoutError:
                # Timeout is normal, just continue listening
                continue
                
            except KeyboardInterrupt:
                print("\nStopping...")
                break
                
            except Exception as e:
                print(f"Error: {e}")
                time.sleep(1)

def main():
    """Main function"""
    print("=" * 50)
    print("Speech to Text - Raspberry Pi")
    print("=" * 50)
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

