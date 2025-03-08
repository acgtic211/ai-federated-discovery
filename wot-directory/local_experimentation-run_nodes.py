import os
import subprocess
import time
import psutil

# Define the ports and database names
ports = [3021, 3022, 3023, 3024, 3025, 3026, 3027]
databases = ["node1-database", "node2-database", "node3-database", "node4-database", "node5-database", "node6-database", "node7-database"]
aiPorts = [8001, 8002, 8003, 8004, 8005, 8006, 8007]

# Function to update the .env file
def update_env_file(port, database, aiPort):
    with open('.env', 'r') as file:
        lines = file.readlines()

    with open('.env', 'w') as file:
        for line in lines:
            if line.startswith('WEB_APP_PORT='):
                file.write(f'WEB_APP_PORT={port}\n')
            elif line.startswith('MONGODB_DATABASE='):
                file.write(f'MONGODB_DATABASE={database}\n')
            elif line.startswith('AI_URI_DEVELOPMENT='):
                file.write(f'AI_URI_DEVELOPMENT=http://localhost:{aiPort}\n')
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
for port, database, aiPort in zip(ports, databases, aiPorts):
    # Update the .env file
    update_env_file(port, database, aiPort)
    
    # Run the application in a new terminal
    subprocess.Popen(['cmd', '/k', 'npm run dev'], creationflags=subprocess.CREATE_NEW_CONSOLE)

    # Introduce a delay to ensure the previous instance starts before the next one
    time.sleep(4)