# Timo the Robot Dog (WaveShare WAVEGO Pro Pi5)

This repository utilizes Waveshare's code as the base for their WAVEGO Pro Pi5, a 12-degree-of-freedom (DOF) bionic quadruped robot. The WAVEGO Pro Pi5 integrates an ESP32 sub-controller and a Raspberry Pi 5 host controller.

## Custom modifications

### Implemented modifications
- [x] Enhanced web interface with better control & command functionality
- [x] Added gimbal reset functionality when robot moves
- [x] Added battery percentage display to web interface
- [x] Optimized camera quality and frame rate
- [x] Fixed command execution issues in command input box

### Planned features
- [ ] AI self-navigation
- [ ] Additional sensor integrations
- [ ] Performance optimizations

## Product documentation

For detailed technical documentation and API references, visit the [WaveShare Wiki](https://www.waveshare.com/wiki/WAVEGO_Pro). 

For installation instructions, tutorials, and detailed usage guides, please refer to the official [WaveShare WAVEGO_Pro repository](https://github.com/waveshareteam/WAVEGO_Pro).

## Technical specifications

### Hardware
- **Degrees of freedom**: 12 DOF with multi-link leg design and inverse kinematics algorithm
- **Servos**: 2.3 kg·cm serial bus servos with real-time feedback on position, speed, and input voltage
- **Sensors**: ICM20948 9-axis motion tracker for self-balancing capabilities
- **Camera**: 5 MP, 160° ultra-wide-angle camera supporting OpenCV functions
- **Display**: 0.96-inch OLED screen for status display
- **Power**: Dual 18650 lithium-ion batteries (5200 mAh) with onboard battery management
- **Construction**: 5052 aluminum alloy and PA12 nylon parts with 40 bearing joints

### Control architecture
- **Host controller**: Raspberry Pi 5 handles AI vision processing and high-level decision-making
- **Sub-controller**: ESP32 manages real-time motion control and sensor data processing
- **Communication**: JSON commands via GPIO UART between controllers
- **Control modes**: ESP-NOW host-sub control mode and JSON task-file record/playback

## Project structure

### RPi
The main Python application running on the Raspberry Pi 5, providing:
- Real-time video streaming based on WebRTC
- Interactive tutorials based on JupyterLab
- Pan-tilt camera control
- Robotic arm control
- Cross-platform web application based on Flask
- Computer vision features (OpenCV, MediaPipe)
- Motion detection and tracking
- Face and gesture recognition
- Line tracking and autonomous navigation

### ESP32
The ESP32 firmware running on the sub-controller, handling:
- Real-time motion control
- Servo management
- Sensor data processing
- Wireless communication
- File system control
- Screen and LED control

## Features

### Computer vision
- Facial recognition (OpenCV & MediaPipe)
- Object recognition (OpenCV)
- Gesture recognition (MediaPipe)
- Motion detection (OpenCV)
- Color tracking (OpenCV)
- Line tracking for autonomous navigation

### Motion capabilities
- 12 DOF quadruped locomotion
- Inverse kinematics for natural movement
- Self-balancing with 9-axis IMU
- Programmable gaits and behaviors
- Real-time servo feedback

### Web interface
- Real-time video streaming
- Remote control via web browser
- System status monitoring
- Configuration management
- Photo and video capture

## Requirements

- Raspberry Pi 5 (recommended) or compatible single-board computer
- ESP32 development board
- WaveShare WAVEGO Pro Pi5 robot kit
- Python 3.x with required packages (see requirements.txt)
- PlatformIO for ESP32 firmware development

## License

This project is licensed under GPL-3.0. See the LICENSE file for details.