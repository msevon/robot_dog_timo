# Import base_ctrl library
from base_ctrl import BaseController
import threading
import yaml, os

# Raspberry Pi version check.
def is_raspberry_pi5():
    with open('/proc/cpuinfo', 'r') as file:
        for line in file:
            if 'Model' in line:
                if 'Raspberry Pi 5' in line:
                    return True
                else:
                    return False

# Determine the GPIO Serial Device Name Based on the Raspberry Pi Model as the BaseController instance
if is_raspberry_pi5():
    base = BaseController('/dev/ttyAMA0', 115200)
else:
    base = BaseController('/dev/serial0', 115200)

# Start the breath light thread
threading.Thread(target=lambda: base.breath_light(15), daemon=True).start()

# Config file
curpath = os.path.realpath(__file__) # Find the path of the current file
thisPath = os.path.dirname(curpath) # Find the path of the current directory
with open(thisPath + '/config.yaml', 'r') as yaml_file: # Open the config file
    f = yaml.safe_load(yaml_file) # Load the config file

# Show information on the OLED screen
base.base_oled(0, f["base_config"]["robot_name"]) # Set the robot name
base.base_oled(1, f"sbc_version: {f['base_config']['sbc_version']}") # Set the sbc version
base.base_oled(2, f"{f['base_config']['main_type']}{f['base_config']['module_type']}") # Set the main type and module type
base.base_oled(3, "Starting...") # Set the starting message

# Print robot name to console
print(f"Robot Name: {f['base_config']['robot_name']}")

# Import necessary modules
from flask import Flask, render_template, Response, request, jsonify, redirect, url_for, send_from_directory, send_file
from flask_socketio import SocketIO, emit
from werkzeug.utils import secure_filename
from aiortc import RTCPeerConnection, RTCSessionDescription
import json
import uuid
import asyncio
import time
import logging
import logging
import cv_ctrl
import os_info

# Create a SystemInfo instance
si = os_info.SystemInfo()

# Create a Flask app instance
app = Flask(__name__)
# log = logging.getLogger('werkzeug')
# log.disabled = True
socketio = SocketIO(app)

# Set to keep track of RTCPeerConnection instances
active_pcs = {}

# Maximum number of active connections allowed
MAX_CONNECTIONS = 2

# Set to keep track of RTCPeerConnection instances
pcs = set()

# Camera funcs
cvf = cv_ctrl.OpencvFuncs(thisPath, base)

# Command actions
cmd_actions = {
    # Zoom
    f['code']['zoom_x1']: lambda: cvf.scale_ctrl(1),
    f['code']['zoom_x2']: lambda: cvf.scale_ctrl(2),
    f['code']['zoom_x4']: lambda: cvf.scale_ctrl(4),

    # Picture capture & video record
    f['code']['pic_cap']: cvf.picture_capture,
    f['code']['vid_sta']: lambda: cvf.video_record(True),
    f['code']['vid_end']: lambda: cvf.video_record(False),

    # Computer vision mode
    f['code']['cv_none']: lambda: cvf.set_cv_mode(f['code']['cv_none']),
    f['code']['cv_moti']: lambda: cvf.set_cv_mode(f['code']['cv_moti']),
    f['code']['cv_face']: lambda: cvf.set_cv_mode(f['code']['cv_face']),
    f['code']['cv_objs']: lambda: cvf.set_cv_mode(f['code']['cv_objs']),
    f['code']['cv_clor']: lambda: cvf.set_cv_mode(f['code']['cv_clor']),
    f['code']['mp_hand']: lambda: cvf.set_cv_mode(f['code']['mp_hand']),
    f['code']['cv_auto']: lambda: cvf.set_cv_mode(f['code']['cv_auto']),
    f['code']['mp_face']: lambda: cvf.set_cv_mode(f['code']['mp_face']),
    f['code']['mp_pose']: lambda: cvf.set_cv_mode(f['code']['mp_pose']),

    # Detection reaction
    f['code']['re_none']: lambda: cvf.set_detection_reaction(f['code']['re_none']),
    f['code']['re_capt']: lambda: cvf.set_detection_reaction(f['code']['re_capt']),
    f['code']['re_reco']: lambda: cvf.set_detection_reaction(f['code']['re_reco']),

    # Movement lock
    f['code']['mc_lock']: lambda: cvf.set_movtion_lock(True),
    f['code']['mc_unlo']: lambda: cvf.set_movtion_lock(False),

    # Head light
    f['code']['led_off']: lambda: cvf.head_light_ctrl(0),
    f['code']['led_aut']: lambda: cvf.head_light_ctrl(1),
    f['code']['led_ton']: lambda: cvf.head_light_ctrl(2),

    # Servo torque lock
    f['code']['release']: lambda: base.bus_servo_torque_lock(255, 0),
    # Servo ID set
    f['code']['s_panid']: lambda: base.bus_servo_id_set(255, 2),
    f['code']['s_tilid']: lambda: base.bus_servo_id_set(255, 1),
    f['code']['set_mid']: lambda: base.bus_servo_mid_set(255),

    # Base light
    f['code']['base_of']: lambda: base.lights_ctrl(0, base.head_light_status),
    f['code']['base_on']: lambda: base.lights_ctrl(255, base.head_light_status),
    f['code']['head_ct']: lambda: cvf.head_light_ctrl(3),
    f['code']['base_ct']: base.base_lights_ctrl
}

# Command feedback actions
cmd_feedback_actions = [f['code']['cv_none'], f['code']['cv_moti'],
                        f['code']['cv_face'], f['code']['cv_objs'],
                        f['code']['cv_clor'], f['code']['mp_hand'],
                        f['code']['cv_auto'], f['code']['mp_face'],
                        f['code']['mp_pose'], f['code']['re_none'],
                        f['code']['re_capt'], f['code']['re_reco'],
                        f['code']['mc_lock'], f['code']['mc_unlo'],
                        f['code']['led_off'], f['code']['led_aut'],
                        f['code']['led_ton'], f['code']['base_of'],
                        f['code']['base_on'], f['code']['head_ct'],
                        f['code']['base_ct']
                        ]

# CV info process
def process_cv_info(cmd):
    if cmd[f['fb']['detect_type']] != f['code']['cv_none']:
        print(cmd[f['fb']['detect_type']])
        pass

# Function to generate video frames from the camera
def generate_frames():
    while True:
        frame = cvf.frame_process()
        # print(cvf.cv_info())
        try:
            yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n') 
        except Exception as e:
            print("An [generate_frames] error occurred:", e)

# Route to render the HTML template
@app.route('/')
def index():
    return render_template('index.html')

# Route for getting the config file
@app.route('/config')
def get_config():
    with open(thisPath + '/config.yaml', 'r') as file:
        yaml_content = file.read()
    return yaml_content

# Get pictures and videos
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('templates', filename)

# Get photo names
@app.route('/get_photo_names')
def get_photo_names():
    photo_files = sorted(os.listdir(thisPath + '/templates/pictures'), key=lambda x: os.path.getmtime(os.path.join(thisPath + '/templates/pictures', x)), reverse=True)
    return jsonify(photo_files)

# Delete photo
@app.route('/delete_photo', methods=['POST'])
def delete_photo():
    filename = request.form.get('filename')
    try:
        os.remove(os.path.join(thisPath + '/templates/pictures', filename))
        return jsonify(success=True)
    except Exception as e:
        print(e)
        return jsonify(success=False)

# Get videos
@app.route('/videos/<path:filename>')
def videos(filename):
    return send_from_directory(thisPath + '/templates/videos', filename)

# Get video names
@app.route('/get_video_names')
def get_video_names():
    video_files = sorted(
        [filename for filename in os.listdir(thisPath + '/templates/videos/') if filename.endswith('.mp4')],
        key=lambda filename: os.path.getctime(os.path.join(thisPath + '/templates/videos/', filename)),
        reverse=True
    )
    return jsonify(video_files)

# Delete video
@app.route('/delete_video', methods=['POST'])
def delete_video():
    filename = request.form.get('filename')
    try:
        os.remove(os.path.join(thisPath + '/templates/videos', filename))
        return jsonify(success=True)
    except Exception as e:
        print(e)
        return jsonify(success=False)

# Manage Video WebRTC connections
def manage_connections(pc_id):
    if len(active_pcs) >= MAX_CONNECTIONS:
        # If maximum connections reached, terminate the oldest connection
        oldest_pc_id = next(iter(active_pcs)) # Get the oldest connection
        old_pc = active_pcs.pop(oldest_pc_id) # Pop the oldest connection
        old_pc.close() # Close the oldest connection

    # Add new connection to active connections
    active_pcs[pc_id] = pc # Add the new connection to the active connections

# Asynchronous function to handle offer exchange
async def offer_async():
    params = await request.json # Get the parameters
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"]) # Create an RTCSessionDescription instance

    pc = RTCPeerConnection() # Create an RTCPeerConnection instance

    # Generate a unique ID for the RTCPeerConnection, limit to 8 characters
    pc_id = "PeerConnection(%s)" % uuid.uuid4()
    pc_id = pc_id[:8]

    # Manage connections, add the new connection to the active connections
    manage_connections(pc_id)

    # Create offer and set the local description
    await pc.createOffer(offer)
    await pc.setLocalDescription(offer)

    # Prepare the response data with local SDP and type
    response_data = {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}

    return jsonify(response_data)

# Wrapper function for running the asynchronous offer function
def offer():
    loop = asyncio.new_event_loop() # Create an event loop
    asyncio.set_event_loop(loop) # Set the event loop
    
    future = asyncio.run_coroutine_threadsafe(offer_async(), loop) # Run the asynchronous offer function
    return future.result()

# Set product version
def set_version(input_main, input_module): 
    base.base_json_ctrl({"T":900,"main":input_main,"module":input_module}) # Send JSON command to the ESP32 to set the main and module version
    if input_main == 1:
        cvf.info_update("RaspRover", (0,255,255), 0.36) # Update the info with the robot name
    elif input_main == 2:
        cvf.info_update("UGV Rover", (0,255,255), 0.36) # Update the info with the robot name
    elif input_main == 3:
        cvf.info_update("UGV Beast", (0,255,255), 0.36) # Update the info with the robot name
    if input_module == 0:
        cvf.info_update("No Module", (0,255,255), 0.36) # Update the info with the module name
    elif input_module == 1:
        cvf.info_update("ARM", (0,255,255), 0.36) # Update the info with the module name
    elif input_module == 2:
        cvf.info_update("PT", (0,255,255), 0.36) # Update the info with the module name

# Commandline control interpreter
def cmdline_ctrl(args_string):
    if not args_string: # If the arguments string is empty, return
        return
    args = args_string.split() # Split the arguments string into a list
    # base -c {"T":1,"L":0.5,"R":0.5}
    if args[0] == 'base': # Base: send JSON command to the ESP32
        if args[1] == '-c' or args[1] == '--cmd':
            base.base_json_ctrl(json.loads(args[2]))
        elif args[1] == '-r' or args[1] == '--recv':
            if args[2] == 'on':
                cvf.show_recv_info(True)
            else:
                cvf.show_recv_info(False)

    elif args[0] == 'send': # Send command: add, remove, broadcast, group
        if args[1] == '-a' or args[1] == '--add':
            if args[2] == '-b' or args[2] == '--broadcast':
                base.base_json_ctrl({"T":303,"mac":"FF:FF:FF:FF:FF:FF"})
            else:
                base.base_json_ctrl({"T":303,"mac":args[2]})
        elif args[1] == '-rm' or args[1] == '--remove':
            if args[2] == '-b' or args[2] == '--broadcast':
                base.base_json_ctrl({"T":304,"mac":"FF:FF:FF:FF:FF:FF"})
            else:
                base.base_json_ctrl({"T":304,"mac":args[2]})
        elif args[1] == '-b' or args[1] == '--broadcast':
            base.base_json_ctrl({"T":306,"mac":"FF:FF:FF:FF:FF:FF","dev":0,"b":0,"s":0,"e":0,"h":0,"cmd":3,"megs":' '.join(args[2:])})
        elif args[1] == '-g' or args[1] == '--group':
            base.base_json_ctrl({"T":305,"dev":0,"b":0,"s":0,"e":0,"h":0,"cmd":3,"megs":' '.join(args[2:])})
        else:
            base.base_json_ctrl({"T":306,"mac":args[1],"dev":0,"b":0,"s":0,"e":0,"h":0,"cmd":3,"megs":' '.join(args[2:])})

    elif args[0] == 'cv': # Computer vision: set target color range, select color, set gimbal tracking parameters
        if args[1] == '-r' or args[1] == '--range':
            try:
                lower_trimmed = args[2].strip("[]")
                lower_nums = [int(lower_num) for lower_num in lower_trimmed.split(",")]
                if all(0 <= num <= 255 for num in lower_nums):
                    pass
                else:
                    return
            except:
                return
            try:
                upper_trimmed = args[3].strip("[]")
                upper_nums = [int(upper_num) for upper_num in upper_trimmed.split(",")]
                if all(0 <= num <= 255 for num in upper_nums):
                    pass
                else:
                    return
            except:
                return
            cvf.change_target_color(lower_nums, upper_nums)
        elif args[1] == '-s' or args[1] == '--select':
            cvf.selet_target_color(args[2])

    elif args[0] == 'video' or args[0] == 'v': # Video: set video quality
        if args[1] == '-q' or args[1] == '--quality':
            try:
                int(args[2])
            except:
                return
            cvf.set_video_quality(int(args[2]))

    elif args[0] == 'line': # Line: set line color range, set line track parameters
        if args[1] == '-r' or args[1] == '--range':
            try:
                lower_trimmed = args[2].strip("[]")
                lower_nums = [int(lower_num) for lower_num in lower_trimmed.split(",")]
                if all(0 <= num <= 255 for num in lower_nums):
                    pass
                else:
                    return
            except:
                return
            try:
                upper_trimmed = args[3].strip("[]")
                upper_nums = [int(upper_num) for upper_num in upper_trimmed.split(",")]
                if all(0 <= num <= 255 for num in upper_nums):
                    pass
                else:
                    return
            except:
                return
            cvf.change_line_color(lower_nums, upper_nums)
        elif args[1] == '-s' or args[1] == '--set':
            if len(args) != 9:
                return
            try:
                for i in range(2,9):
                    float(args[i])
            except:
                return
            # line -s 0.7 0.8 1.6 0.0006 0.6 0.4 0.2
            cvf.set_line_track_args(float(args[2]), float(args[3]), float(args[4]), float(args[5]), float(args[6]), float(args[7]), float(args[8]))

    elif args[0] == 'track': # Point tracking: set point tracking parameters
        cvf.set_pt_track_args(args[1], args[2])

    elif args[0] == 'timelapse': # Timelapse: set timelapse parameters
        if args[1] == '-s' or args[1] == '--start':
            if len(args) != 6:
                return
            try:
                move_speed = float(args[2])
                move_time  = float(args[3])
                t_interval = float(args[4])
                loop_times = int(args[5])
            except:
                return
            cvf.timelapse(move_speed, move_time, t_interval, loop_times)
        elif args[1] == '-e' or args[1] == '--end' or args[1] == '--stop':
            cvf.mission_stop()

    elif args[0] == 'p': # Set product version
        main_type = int(args[1][0])
        module_type = int(args[1][1])
        set_version(main_type, module_type)

    # s 20
    elif args[0] == 's': # Set product version
        main_type = int(args[1][0])
        module_type = int(args[1][1])
        if main_type == 1:
            f['base_config']['robot_name'] = "RaspRover"
            f['args_config']['max_speed'] = 0.65
            f['args_config']['slow_speed'] = 0.3
        elif main_type == 2:
            f['base_config']['robot_name'] = "UGV Rover"
            f['args_config']['max_speed'] = 1.3
            f['args_config']['slow_speed'] = 0.2
        elif main_type == 3:
            f['base_config']['robot_name'] = "UGV Beast"
            f['args_config']['max_speed'] = 1.0
            f['args_config']['slow_speed'] = 0.2
        f['base_config']['main_type'] = main_type
        f['base_config']['module_type'] = module_type
        with open(thisPath + '/config.yaml', "w") as yaml_file:
            yaml.dump(f, yaml_file)
        set_version(main_type, module_type)

    elif args[0] == 'test': # Test: update base data
        cvf.update_base_data({"T":1003,"mac":1111,"megs":"helllo aaaaaaaa"})

# Route to handle the offer request
@app.route('/offer', methods=['POST'])
def offer_route():
    return offer()

# Route to stream video frames
@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# Send command from the web interface
@app.route('/send_command', methods=['POST'])
def handle_command():
    command = request.form['command']
    print("Received command:", command)
    cvf.info_update("CMD:" + command, (0,255,255), 0.36) # Update the info with the command
    try:
        cmdline_ctrl(command) # Execute the command with the cmdline_ctrl function
    except Exception as e:
        print(f"[app.handle_command] error: {e}")
    return jsonify({"status": "success", "message": "Command received"})

# Serve static settings
@app.route('/settings/<path:filename>')
def serve_static_settings(filename):
    return send_from_directory('templates', filename)

# Handle socket JSON command
@socketio.on('json', namespace='/json')
def handle_socket_json(json):
    try:
        base.base_json_ctrl(json) # Send JSON command to the ESP32
    except Exception as e:
        print("Error handling JSON data:", e)
        return

# Update data websocket single
def update_data_websocket_single():
    # {'T':1001,'L':0,'R':0,'r':0,'p':0,'v': 11,'pan':0,'tilt':0}
    try:
        socket_data = {
            f['fb']['picture_size']:     si.pictures_size,
            f['fb']['video_size']:       si.videos_size,
            f['fb']['cpu_load']:         si.cpu_load,
            f['fb']['cpu_temp']:         si.cpu_temp,
            f['fb']['ram_usage']:        si.ram,
            f['fb']['wifi_rssi']:        si.wifi_rssi,

            f['fb']['led_mode']:         cvf.cv_light_mode,
            f['fb']['detect_type']:      cvf.cv_mode,
            f['fb']['detect_react']:     cvf.detection_reaction_mode,
            f['fb']['pan_angle']:        cvf.pan_angle,
            f['fb']['tilt_angle']:       cvf.tilt_angle,
            f['fb']['base_voltage']:     base.base_data.get('v', 0) if base.base_data else 0,
            f['fb']['video_fps']:        cvf.video_fps,
            f['fb']['cv_movtion_mode']:  cvf.cv_movtion_lock,
            f['fb']['base_light']:       base.base_light_status
        }

        socketio.emit('update', socket_data, namespace='/ctrl')
    except Exception as e:
        print("An [app.update_data_websocket_single] error occurred:", e)

# Info feedback
def update_data_loop():
    base.base_oled(2, "F/J:5000/8888")
    start_time = time.time()
    time.sleep(1)
    while 1:
        update_data_websocket_single()

        # Get Ethernet IP and WiFi IP
        eth0 = si.eth0_ip
        wlan = si.wlan_ip

        # Show Ethernet IP and WiFi IP on the OLED screen
        if eth0:
            base.base_oled(0, f"E:{eth0}")
        else:
            base.base_oled(0, f"E: No Ethernet")
        if wlan:
            base.base_oled(1, f"W:{wlan}")
        else:
            base.base_oled(1, f"W: NO {si.net_interface}")

        # Calculate elapsed time
        elapsed_time = time.time() - start_time
        hours = int(elapsed_time // 3600)
        minutes = int((elapsed_time % 3600) // 60)
        seconds = int(elapsed_time % 60)

        # Show WiFi mode, elapsed time, and WiFi signal strength on the OLED screen
        base.base_oled(3, f"{si.wifi_mode} {hours:02d}:{minutes:02d}:{seconds:02d} {si.wifi_rssi}dBm")
        time.sleep(5) # Update every 5 seconds

# Get base data
def base_data_loop():
    sensor_interval = 1 # Update sensor data every 1 second
    sensor_read_time = time.time()
    while True:
        cvf.update_base_data(base.feedback_data()) # Update base data from the ESP32

        # Get sensor data from the ESP32
        if base.extra_sensor:
            if time.time() - sensor_read_time > sensor_interval:
                base.rl.read_sensor_data() # Read sensor data from the ESP32
                sensor_read_time = time.time()
        
        # Get lidar data
        if base.use_lidar:
            base.rl.lidar_data_recv()
        
        time.sleep(0.025) # Update every 0.025 seconds

# Handle socket command
@socketio.on('message', namespace='/ctrl')
def handle_socket_cmd(message):
    try:
        json_data = json.loads(message) # Load the JSON data
    except json.JSONDecodeError:
        print("Error decoding JSON.[app.handle_socket_cmd]")
        return
    cmd_a = float(json_data.get("A", 0)) # Get the command
    if cmd_a in cmd_actions:
        cmd_actions[cmd_a]() # Execute the command with the cmd_actions function
    else:
        pass
    if cmd_a in cmd_feedback_actions: 
        threading.Thread(target=update_data_websocket_single, daemon=True).start() # Execute the command with the update_data_websocket_single function

# Commans run on boot
def cmd_on_boot():
    cmd_list = [
        'base -c {"T":142,"cmd":50}',   # Set feedback interval as (50 ms)
        'base -c {"T":131,"cmd":1}',    # Serial feedback flow on
        'base -c {"T":143,"cmd":0}',    # Serial echo off
        'base -c {{"T":4,"cmd":{}}}'.format(f['base_config']['module_type']), # Select the module - 0:None 1:RoArm-M2-S 2:Gimbal
        'base -c {"T":300,"mode":0,"mac":"EF:EF:EF:EF:EF:EF"}', # The base won't be ctrl by esp-now broadcast cmd, but it can still recv broadcast megs
        'send -a -b' # Add broadcast mac addr to peer
    ]
    print('base -c {{"T":4,"cmd":{}}}'.format(f['base_config']['module_type']))
    
    # Execute the commands
    for i in range(0, len(cmd_list)):
        cmdline_ctrl(cmd_list[i])
        cvf.info_update(cmd_list[i], (0,255,255), 0.36) # Update the info with the command
    set_version(f['base_config']['main_type'], f['base_config']['module_type'])

# Run the Flask app
if __name__ == "__main__":
    # Lights off
    base.lights_ctrl(255, 255)

    # Update the size of videos and pictures
    si.update_folder(thisPath)

    # Pt/arm looks forward
    if f['base_config']['module_type'] == 1:
        base.base_json_ctrl({"T":f['cmd_config']['cmd_arm_ctrl_ui'],"E":f['args_config']['arm_default_e'],"Z":f['args_config']['arm_default_z'],"R":f['args_config']['arm_default_r']})
    else:
        base.gimbal_ctrl(0, 0, 200, 10)

    # Feedback loop starts
    si.start()
    si.resume()
    data_update_thread = threading.Thread(target=update_data_loop, daemon=True)
    data_update_thread.start()

    # Base data update
    base_update_thread = threading.Thread(target=base_data_loop, daemon=True)
    base_update_thread.start()

    # Lights off
    base.lights_ctrl(0, 0)
    cmd_on_boot()

    # Run the main web app
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)