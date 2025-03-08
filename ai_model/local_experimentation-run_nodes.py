import os
import subprocess
import time
import psutil

# Define the ports and database names
ports = [8001, 8002, 8003, 8004, 8005, 8006, 8007]
documents = ["traces2_1.csv", "traces2_2.csv", "traces2_3.csv", "traces2_4.csv", "traces2_5.csv", "traces2_6.csv", "traces2_7.csv"]

# Function to update the .env file
def update_env_file(port, document):
    with open('.env', 'r') as file:
        lines = file.readlines()

    with open('.env', 'w') as file:
        for line in lines:
            if line.startswith('DOCUMENT='):
                file.write(f'DOCUMENT={document}\n')
            else:
                file.write(line)

# Function to kill processes running on specified ports
def kill_processes_on_ports(ports):
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            connections = proc.connections()
            for conn in connections:
                if conn.laddr.port in ports:
                    print(f"Killing process {proc.info['pid']} on port {conn.laddr.port}")
                    proc.kill()
        except (psutil.AccessDenied, psutil.NoSuchProcess):
            continue

# Function to close terminal windows
def close_terminal_windows():
    subprocess.call(['taskkill', '/F', '/IM', 'cmd.exe'])

# Kill existing processes on specified ports and close Visual Studio Code terminals
kill_processes_on_ports(ports)
#close_terminal_windows()

# Loop through the ports and databases
for port, document in zip(ports, documents):
    # Update the .env file
    update_env_file(port, document)
    
    # Run the application in a new terminal
    subprocess.Popen(['cmd', '/k', f'uvicorn app.api:app --port {port}'], creationflags=subprocess.CREATE_NEW_CONSOLE)

    # Introduce a delay to ensure the previous instance starts before the next one
    time.sleep(30)