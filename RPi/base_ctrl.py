import serial  
import json
import queue
import threading
import yaml
import os
import time
import glob
import numpy as np

curpath = os.path.realpath(__file__)
thisPath = os.path.dirname(curpath)
with open(thisPath + '/config.yaml', 'r') as yaml_file:
    f = yaml.safe_load(yaml_file)

# Class for auxiliary class ReadLine: helps read data from the serial port
class ReadLine:
	def __init__(self, s):
		self.buf = bytearray() # Buffer for the serial port
		self.s = s # Serial port (ESP32)

		self.sensor_data = [] # List for the sensor data
		self.sensor_list = [] # List for the sensor list
		try:
			self.sensor_data_ser = serial.Serial(glob.glob('/dev/ttyUSB*')[0], 115200) # Define the serial port (additional sensors)
			print("/dev/ttyUSB* connected succeed")
		except:
			self.sensor_data_ser = None # If the serial port for additional sensors is not found, set it to None
		self.sensor_data_max_len = 51 # Maximum length of the sensor data

		try:
			self.lidar_ser = serial.Serial(glob.glob('/dev/ttyACM*')[0], 230400, timeout=1) # Define the serial port (LIDAR)
			print("/dev/ttyACM* connected succeed")
		except:
			self.lidar_ser = None # If the serial port for LIDAR is not found, set it to None
		
		# LiDAR settings
		self.ANGLE_PER_FRAME = 12
		self.HEADER = 0x54
		self.lidar_angles = []
		self.lidar_distances = []
		self.lidar_angles_show = []
		self.lidar_distances_show = []
		self.last_start_angle = 0

	def readline(self): # Read data from the serial port
		i = self.buf.find(b"\n") # Check if newline is found
		if i >= 0:
			r = self.buf[:i+1] # Get the data before the newline
			self.buf = self.buf[i+1:] # Remove the data before the newline
			return r # Return the data before the newline
		while True:
			i = max(1, min(512, self.s.in_waiting)) # Get the number of bytes available for reading
			data = self.s.read(i) # Read data from the serial port
			i = data.find(b"\n") # Check if newline is found
			if i >= 0:
				r = self.buf + data[:i+1] # Get the data before the newline
				self.buf[0:] = data[i+1:] # Remove the data before the newline
				return r # Return the data before the newline
			else:
				self.buf.extend(data) # Add the data to the buffer

	def clear_buffer(self):
		self.s.reset_input_buffer() # Clear the input buffer

	def read_sensor_data(self):
		if self.sensor_data_ser == None: # If the serial port for additional sensors is not found, return
			return

		try:
			buffer_clear = False # Flag to clear the buffer
			while self.sensor_data_ser.in_waiting > 0: # Check if there is data in the buffer waiting
				buffer_clear = True # Update the flag
				sensor_readline = self.sensor_data_ser.readline() # Read data from the serial port
				if len(sensor_readline) <= self.sensor_data_max_len: # If the data is less than the maximum length, add the data to the list
					self.sensor_list.append(sensor_readline.decode('utf-8')[:-2]) # Add the data to the list in utf-8 format
				else: # If line is longer than the maximum length, add the data to the list in two parts
					self.sensor_list.append(sensor_readline.decode('utf-8')[:self.sensor_data_max_len])
					self.sensor_list.append(sensor_readline.decode('utf-8')[self.sensor_data_max_len:-2])
			if buffer_clear: # If something was read
				self.sensor_data = self.sensor_list.copy() # Copy the data to the sensor data
				self.sensor_list.clear() # Clear the list
				self.sensor_data_ser.reset_input_buffer() # Clear the input buffer
		except Exception as e:
			print(f"[base_ctrl.read_sensor_data] error: {e}")

	def parse_lidar_frame(self, data):
		# header = data[0]
		# verlen = data[1]
		# speed  = data[3] << 8 | data[2]
		start_angle = (data[5] << 8 | data[4]) * 0.01 # Detect the start angle
		# print(start)
		# end_angle = (data[43] << 8 | data[42]) * 0.01
		for i in range(0, self.ANGLE_PER_FRAME): # Loop through the angles
			offset = 6 + i * 3 # Calculate the offset
			distance = data[offset+1] << 8 | data[offset] # Calculate the distance
			confidence = data[offset+2] # Calculate the confidence
			# lidar_angles.append(np.radians(start_angle + i * 0.167))
			self.lidar_angles.append(np.radians(start_angle + i * 0.83333 + 180)) # Add the angle to the list
			# lidar_angles.append(np.radians(start_angle + end_angle))
			self.lidar_distances.append(distance) # Add the distance to the list
		# end_angle = (data[43] << 8 | data[42]) * 0.01
		# timestamp = data[45] << 8 | data[44]
		# crc = data[46]
		return start_angle

	def lidar_data_recv(self):
		if self.lidar_ser == None: # If no LIDAR is found, return
			return
		try:
			while True: # Loop until the start angle is detected
				self.header = self.lidar_ser.read(1)
				if self.header == b'\x54': # If the header is detected
					# Read the rest of the data
					data = self.header + self.lidar_ser.read(46)
					hex_data = [int(hex(byte), 16) for byte in data] # Convert the data to hex
					start_angle = self.parse_lidar_frame(hex_data)
					if self.last_start_angle > start_angle: # If the start angle is detected
						break
					self.last_start_angle = start_angle # Update the last start angle
				else:
					self.lidar_ser.flushInput() # Flush the input buffer

			self.last_start_angle = start_angle # Update the last start angle

			# Copy the angles and distances to the list and clear them
			self.lidar_angles_show = self.lidar_angles.copy() 
			self.lidar_distances_show = self.lidar_distances.copy()
			self.lidar_angles.clear()
			self.lidar_distances.clear()
			
		except Exception as e:
			print(f"[base_ctrl.lidar_data_recv] error: {e}")
			self.lidar_ser = serial.Serial(glob.glob('/dev/ttyACM*')[0], 230400, timeout=1)

# Class for the base controller of the WAVEGO Pro Pi5
class BaseController:

	# uart_dev_set: the serial port of the base controller
	# buad_set: the baud rate of the serial port

	def __init__(self, uart_dev_set, buad_set):
		self.ser = serial.Serial(uart_dev_set, buad_set, timeout=1) # Define the serial port (ESP32)
		self.rl = ReadLine(self.ser) # Define the ReadLine class

		# Define the command queue and thread (and start the thread)
		self.command_queue = queue.Queue()
		self.command_thread = threading.Thread(target=self.process_commands, daemon=True)
		self.command_thread.start()

		# Define the base light status and head light status
		self.base_light_status = 0
		self.head_light_status = 0

		self.data_buffer = None # Temporary buffer where ESP32 sub-controller sends data to be parsed by the base controller
		self.base_data = None # Last received JSON-data packet from the ESP32 sub-controller

		self.use_lidar = f['base_config']['use_lidar'] # Whether to use the lidar sensor
		self.extra_sensor = f['base_config']['extra_sensor'] # Whether to use the extra sensor
		
	# Function to read feedback data from the ESP32 sub-controller
	def feedback_data(self):
		try:
			while self.rl.s.in_waiting > 0: # in_waiting: the number of bytes in the input buffer of ReadLine class
				self.data_buffer = json.loads(self.rl.readline().decode('utf-8')) # Define data buffer as the JSON-data packet created from the ESP32 sub-controller data red by readline function of ReadLine class
				if 'T' in self.data_buffer:
					# print(self.data_buffer)
					self.base_data = self.data_buffer # Define base data as the data buffer
					self.data_buffer = None # Empty the data buffer
					
					if self.base_data["T"] == 1003: # Debugging mode possibly?
						print(self.base_data)
						return self.base_data
			
			# If the data buffer is empty, read the data from the serial port again
			self.rl.clear_buffer() # Clear the input buffer of ReadLine class
			self.data_buffer = json.loads(self.rl.readline().decode('utf-8')) # Try to read the data from the serial port again
			self.base_data = self.data_buffer # Define base data as the data buffer
			
			return self.base_data

		except Exception as e:
			self.rl.clear_buffer() # Clear the input buffer of ReadLine class
			print(f"[base_ctrl.feedback_data] error: {e}")

	def on_data_received(self):
		self.ser.reset_input_buffer()
		data_read = json.loads(self.rl.readline().decode('utf-8')) # Read data from the serial port

		return data_read

	def send_command(self, data):
		self.command_queue.put(data) # Add command to the queue

	def process_commands(self):
		while True:
			data = self.command_queue.get() # Get command from the queue
			self.ser.write((json.dumps(data) + '\n').encode("utf-8")) # Write command to the serial port
			# print(data)

	def base_json_ctrl(self, input_json): # Send simple command to the ESP32 sub-controller
		self.send_command(input_json)

	def gimbal_emergency_stop(self): # Send emergency stop command to the ESP32 sub-controller
		data = {"T":0}
		self.send_command(data)

	def base_speed_ctrl(self, input_left, input_right): # Send speed command to the ESP32 sub-controller
		data = {"T":1,"L":input_left,"R":input_right}
		self.send_command(data)

	def gimbal_ctrl(self, input_x, input_y, input_speed, input_acceleration): # Send gimbal position command to the ESP32 sub-controller
		data = {"T":133,"X":input_x,"Y":input_y,"SPD":input_speed,"ACC":input_acceleration}
		self.send_command(data)

	def gimbal_base_ctrl(self, input_x, input_y, input_speed): # Send gimbal position command to the ESP32 sub-controller
		data = {"T":141,"X":input_x,"Y":input_y,"SPD":input_speed}
		self.send_command(data)

	def base_oled(self, input_line, input_text): # Send OLED text command to the ESP32 sub-controller
		# data = {"T":3,"lineNum":input_line,"Text":input_text}
		data = {"T":202,"line":input_line + 1,"text":input_text,"update":1}
		self.send_command(data)

	def base_default_oled(self): # Send default OLED text command to the ESP32 sub-controller
		data = {"T":-3}
		self.send_command(data)

	def bus_servo_id_set(self, old_id, new_id): # Send change servo ID command to the ESP32 sub-controller
		# data = {"T":54,"old":old_id,"new":new_id}
		data = {"T":f['cmd_config']['cmd_set_servo_id'],"raw":old_id,"new":new_id}
		self.send_command(data)

	def bus_servo_torque_lock(self, input_id, input_status): # Send torque lock command to the ESP32 sub-controller
		# data = {"T":55,"id":input_id,"status":input_status}
		data = {"T":f['cmd_config']['cmd_servo_torque'],"id":input_id,"cmd":input_status}
		self.send_command(data)

	def bus_servo_mid_set(self, input_id): # Send change servo middle position command to the ESP32 sub-controller
		# data = {"T":58,"id":input_id}
		data = {"T":f['cmd_config']['cmd_set_servo_mid'],"id":input_id}
		self.send_command(data)

	def lights_ctrl(self, pwmA, pwmB): # Send light command to the ESP32 sub-controller
		data = {"T":132,"IO4":pwmA,"IO5":pwmB}
		self.send_command(data)
		self.base_light_status = pwmA
		self.head_light_status = pwmB

	def base_lights_ctrl(self): # Send base light command to the ESP32 sub-controller
		if self.base_light_status != 0:
			self.base_light_status = 0
		else:
			self.base_light_status = 255
		self.lights_ctrl(self.base_light_status, self.head_light_status)

	def rgb_light(self, id, r, g, b): # Send RGB light command to the ESP32 sub-controller
		data = {"T":201,"set":[id, r, g, b]}
		self.send_command(data)

	def gimbal_dev_close(self): # Close the serial port of the ESP32 sub-controller
		self.ser.close()

	def breath_light(self, input_time): # Send breath light command to the ESP32 sub-controller
		breath_start_time = time.time() # Define the start time of the breath light
		while time.time() - breath_start_time < input_time:
			for i in range(0, 128, 10): # "Inhale"
				# self.lights_ctrl(i, 128-i)
				self.rgb_light(0, round(255*(i/128)), 0, round(64*(i/128)))
				self.rgb_light(1, round(64*(i/128)), 0, round(255*(i/128)))
				time.sleep(0.1)
			for i in range(0, 128, 10): # "Exhale"
				# self.lights_ctrl(128-i, i)
				self.rgb_light(0, round(64*((128-i)/128)), 0, round(255*((128-i)/128)))
				self.rgb_light(1, round(255*((128-i)/128)), 0, round(64*((128-i)/128)))
				time.sleep(0.1)
		# self.lights_ctrl(0, 0)
		self.rgb_light(0, 64, 0, 255)
		self.rgb_light(1, 255, 0, 64)


if __name__ == '__main__':
	# RPi5
	base = BaseController('/dev/ttyAMA0', 921600)

	# RPi4B
	# base = BaseController('/dev/serial0', 921600)

	# base.send_command({"T":201,"set":[0,9,0,0]})
	# time.sleep(1)
	# base.send_command({"T":201,"set":[1,9,0,0]})
	# time.sleep(1)

	# breath light for 15s
	# base.breath_light(15)

	# gimble ctrl, look forward
	#                x  y  spd acc
	# base.gimbal_ctrl(0, 0, 10, 0)
    
    # x(-180 ~ 180)
	# x- look left
	# x+ look right

	# y(-30 ~ 90)
	# y- look down
	# y+ look up

	while True:
		print(base.feedback_data())